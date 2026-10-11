<script setup lang="ts">
import Active from '@src/components/forms/Active.vue';
import Commands from '@src/components/forms/Commands.vue';
import PrunButton from '@src/components/PrunButton.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { showTileOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import EditPriceLimits from '@src/features/XIT/ACT/actions/cx-buy/EditPriceLimits.vue';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { configurableValue, groupTargetPrefix } from '@src/features/XIT/ACT/shared-types';
import { useContLocations } from '@src/features/XIT/ACT/actions/cont-locations';
import { balancesStore } from '@src/infrastructure/prun-api/data/balances';
import { maxContractDays, minContractDays } from '@src/features/XIT/ACT/actions/cont-limits';
import NumericInput from '@src/components/forms/NumericInput.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import {
  parseCSVToOrders,
  contLocationIsCX,
  OrderModes,
} from '@src/features/XIT/ACT/actions/px-buy/utils';

const { action, pkg } = defineProps<{
  action: UserData.ActionData;
  pkg: UserData.ActionPackageData;
}>();

const materialGroups = computed(() => pkg.groups.map(x => x.name!).filter(x => x));
const materialGroup = ref(action.group ?? materialGroups.value[0]);

const priceLimits = ref(getPriceLimits());

function getPriceLimits() {
  const priceLimits = action.priceLimits ?? {};
  return Object.keys(priceLimits).map(x => [x, priceLimits[x]]) as [string, number][];
}

const orderMode = ref(action.orderMode ?? configurableValue);
const useInv = ref(action.useInv ?? true);

const exchangeUrl = ref(action.exchangeUrl ?? '');
const fallbackToCX = ref(action.fallbackToCX ?? false);

function onEditPriceLimitsClick(e: Event) {
  showTileOverlay(e, EditPriceLimits, reactive({ priceLimits }));
}

const pxState = ref<'UNKNOWN' | 'VALIDATING' | 'INVALID' | 'VALID'>('UNKNOWN');
const fetchedOrders = ref<number | undefined>();

watch(exchangeUrl, () => {
  pxState.value = 'UNKNOWN';
  fetchedOrders.value = undefined;
});

async function validate(): Promise<boolean> {
  if (!materialGroup.value) {
    return false;
  }
  // A location saved before the player abandoned that base is no longer selectable.
  const locations = locationOptions.value.map(x => (typeof x === 'string' ? x : x.value));
  if (!locations.includes(contLocation.value)) {
    return false;
  }
  const days = Number(daysToFulfill.value);
  if (!Number.isInteger(days) || days < minContractDays || days > maxContractDays) {
    return false;
  }
  return validatePX();
}

async function validatePX(): Promise<boolean> {
  pxState.value = 'VALIDATING';
  if (!exchangeUrl.value) {
    pxState.value = 'INVALID';
    return false;
  }
  const parsedUrl = URL.parse(exchangeUrl.value);
  if (!parsedUrl) {
    pxState.value = 'INVALID';
    return false;
  }
  try {
    const res = await fetch(parsedUrl);
    try {
      const text = await res.text();
      const orders = parseCSVToOrders(text);
      pxState.value = 'VALID';
      fetchedOrders.value = orders.length;
      return true;
    } catch {
      pxState.value = 'INVALID';
      return false;
    }
  } catch {
    pxState.value = 'INVALID';
    return false;
  }
}

const staticLocations = useContLocations();

// A group with no planet resolves to nothing at run time, so it is not offered.
const groupTargetOptions = computed(() =>
  pkg.groups
    .filter(x => x.name && x.planet)
    .map(x => ({
      label: `[${x.name}] target`,
      value: `${groupTargetPrefix}${x.name}`,
    })),
);

const locationOptions = computed(() => [
  configurableValue,
  ...groupTargetOptions.value,
  ...staticLocations.value,
]);

// The currencies the player actually holds a balance in.
const currencies = computed(() => balancesStore.currencies.value ?? []);

const contLocation = ref(action.contLocation ?? staticLocations.value[0] ?? '');
const currency = ref(action.currency ?? 'AIC');

const daysToFulfill = ref(action.daysToFulfill ?? 3);
const ignoreStock = ref(action.ignoreStock ?? false);

async function save() {
  action.group = materialGroup.value;
  action.exchangeUrl = exchangeUrl.value;
  action.fallbackToCX = fallbackToCX.value;
  action.contLocation = contLocation.value;
  action.priceLimits = {};
  for (let [ticker, price] of priceLimits.value) {
    const material = materialsStore.getByTicker(ticker);
    if (!material || price === 0 || !isFinite(price)) {
      continue;
    }
    action.priceLimits[material.ticker] = price;
  }
  action.orderMode = orderMode.value;
  action.useInv = useInv.value;
  action.currency = currency.value;
  action.daysToFulfill = Number(daysToFulfill.value);
  action.ignoreStock = ignoreStock.value;
}

defineExpose({ validate, save, validatePX });
</script>

<template>
  <Active label="Material Group">
    <SelectInput v-model="materialGroup" :options="materialGroups" />
  </Active>
  <Commands label="Price Limits">
    <PrunButton primary @click="onEditPriceLimitsClick">EDIT</PrunButton>
  </Commands>
  <Active label="Location">
    <SelectInput v-model="contLocation" :options="locationOptions" />
  </Active>
  <Active
    label="Exchange URL"
    tooltip="Link to the CSV of private exchange offers formatted as [Username, Ticker, Quantity, Price]."
    :error="pxState == 'INVALID'">
    <TextInput v-model="exchangeUrl" />
  </Active>
  <Commands label="Test Exchange URL">
    <PrunButton
      :primary="pxState == 'UNKNOWN'"
      :disabled="pxState == 'VALIDATING'"
      :danger="pxState == 'INVALID'"
      :success="pxState == 'VALID'"
      @click="validatePX()"
      >{{ pxState == 'VALID' && fetchedOrders ? `${fetchedOrders} Orders` : 'TEST' }}</PrunButton
    ></Commands
  >
  <Active
    label="Use Inventory"
    tooltip="Whether to use stock when calculating how much needs to be bought.">
    <RadioItem v-model="useInv">use inventory</RadioItem>
  </Active>
  <Active label="Ignore Stock" tooltip="Whether to ignore vendors' posted stock when purchasing.">
    <RadioItem v-model="ignoreStock">ignore stock</RadioItem>
  </Active>
  <Active
    label="Order Mode"
    tooltip="The method for placing orders.\nFull: Only purchase if the full quantity is available.\nPartial: Only purchase the quantity available.\nBackorder: Place an order for the full quantity, even if it is not available.">
    <SelectInput v-model="orderMode" :options="OrderModes" />
  </Active>
  <Active
    v-if="contLocationIsCX(contLocation)"
    label="Fallback to CX"
    tooltip="Whether to use the CX when the PX is insufficient.">
    <RadioItem v-model="fallbackToCX">fallback to cx</RadioItem>
  </Active>
  <Active label="Currency" tooltip="The currency used in the contracts. Ignored for CX orders.">
    <SelectInput v-model="currency" :options="currencies" />
  </Active>
  <Active label="Days to Fulfill">
    <NumericInput v-model="daysToFulfill" :min="minContractDays" :max="maxContractDays" :step="1" />
  </Active>
</template>
