<script setup lang="ts">
import Active from '@src/components/forms/Active.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { Config } from '@src/features/XIT/ACT/actions/px-buy/config';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';
import {
  displayLocationValue,
  useContLocations,
} from '@src/features/XIT/ACT/actions/cont-locations';
import Passive from '@src/components/forms/Passive.vue';
import { contLocationIsCX, OrderModes } from '@src/features/XIT/ACT/actions/px-buy/utils';

const { data, config } = defineProps<{ data: UserData.ActionData; config: Config }>();

const locations = useContLocations();

if (data.contLocation === configurableValue && !config.contLocation && locations.value.length > 0) {
  config.contLocation = locations.value[0];
}

watchEffect(() => {
  if (data.contLocation === configurableValue) {
    if (config.contLocation && !locations.value.includes(config.contLocation)) {
      config.contLocation = undefined;
    }
    if (!config.contLocation && locations.value.length === 1) {
      config.contLocation = locations.value[0];
    }
  }
});

config.skip ??= false;
</script>

<template>
  <form>
    <Active
      v-if="data.skippable"
      label="Skip PX Buy"
      tooltip="Whether to skip purchasing materials and only perform the transfer.">
      <RadioItem v-model="config.skip">skip px buy</RadioItem>
    </Active>
    <Active
      label="Order Mode"
      :tooltip="`The method for placing orders.\nFull: Only purchase if the full quantity is available.\nPartial: Only purchase the quantity available.\nBackorder: Place an order for the full quantity, even if it is not available.`"
      :class="$style.multilineTooltip">
      <SelectInput
        v-model="config.orderMode"
        :options="OrderModes.filter(x => x.value !== configurableValue)" />
    </Active>
    <Active
      v-if="config.contLocation && contLocationIsCX(config.contLocation) && !config.skip"
      label="Fallback to CX"
      tooltip="Whether to use the CX when the PX is insufficient.">
      <RadioItem v-model="config.fallbackToCX">fallback to cx</RadioItem>
    </Active>
    <Active v-if="data.contLocation === configurableValue && !config.skip" label="Location">
      <SelectInput v-model="config.contLocation" :options="locations" />
    </Active>
    <Passive v-else-if="!config.skip" label="Location">
      <span>{{ displayLocationValue(data.contLocation) }}</span>
    </Passive>
  </form>
</template>
<style module>
.multilineTooltip {
  white-space: pre;
}
</style>
