import { refTextContent } from '@src/utils/reactive-dom';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { flightsStore } from '@src/infrastructure/prun-api/data/flights';
import { createReactiveSpan } from '@src/utils/reactive-element';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { blueprintsStore } from '@src/infrastructure/prun-api/data/blueprints';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { getPrice } from '@src/infrastructure/fio/cx';
import { fixed0, formatCurrency } from '@src/utils/format';
import { sumBy } from '@src/utils/sum-by';
import { flightPlansStore } from '@src/infrastructure/prun-api/data/flight-plans';
import { calculateRepairCosts } from '@src/core/ship-repair';
import PrunLink from '@src/components/PrunLink.vue';
import Material = PrunApi.Material;

function onTileReady(tile: PrunTile) {
  const ship = computed(() => shipsStore.getByRegistration(tile.parameter));
  const blueprint = computed(() => blueprintsStore.getByNaturalId(ship.value?.blueprintNaturalId));
  const overallPrice = ref<number | undefined>();
  void addSummaryPrice(tile, overallPrice);
  void prepareBlueprintFetchButton(tile, ship, blueprint);
  subscribe($$(tile.anchor, C.MissionPlan.table), x =>
    onTableReady(x, ship, blueprint, overallPrice),
  );
}

async function addSummaryPrice(tile: PrunTile, overallPrice: Ref<number | undefined>) {
  subscribe($$(tile.anchor, C.FormComponent.containerPassive), async x => {
    const label = await $(x, 'label');
    if (label.textContent !== L.ShipFlightControl.label.status()) {
      return;
    }
    const value = await $(x, C.StaticInput.static);
    const priceSpan = createReactiveSpan(
      value,
      computed(() =>
        overallPrice.value !== undefined
          ? `${formatCurrency(overallPrice.value, fixed0)} - `
          : undefined,
      ),
    );
    value.appendChild(priceSpan);
  });
}

async function prepareBlueprintFetchButton(
  tile: PrunTile,
  ship: Ref<PrunApi.Ship | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
) {
  const cmdRow = await $(tile.anchor, C.FormComponent.containerCommand);
  const inputContainer = await $(cmdRow, C.FormComponent.input);
  createFragmentApp(() => (
    <>
      {blueprint.value === undefined && (
        <PrunButton
          neutral
          onClick={() =>
            showBuffer(`BLU ${ship.value?.blueprintNaturalId ?? ''}`, {
              autoClose: true,
              force: true,
            })
          }>
          CALCULATE COSTS
        </PrunButton>
      )}{' '}
    </>
  )).prependTo(inputContainer);
}

async function onTableReady(
  table: HTMLElement,
  ship: Ref<PrunApi.Ship | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
  overallPrice: Ref<number | undefined>,
) {
  const planId = refPrunId(table);
  const flightOrPlan = computed(() => getFlightOrPlan(ship.value, planId.value));
  const headerRow = await $(table, 'thead');
  if (!headerRow.firstElementChild) {
    return;
  }
  const headers = Array.from(headerRow.firstElementChild.children);
  const segmentColumnIndex = headers.findIndex(x =>
    x.textContent.includes(L.FlightPlan.index() ?? '#'),
  );
  const damageColumnIndex = headers.findIndex(x =>
    x.textContent.includes(L.FlightPlan.damage() ?? 'Damage'),
  );
  const fuelColumnIndex = headers.findIndex(x =>
    x.textContent.includes(L.FlightPlan.consumption() ?? 'Consumption'),
  );
  const stlFuelConsumption = computed(() =>
    sumBy(flightOrPlan.value?.segments, x => x.stlFuelConsumption ?? 0),
  );
  const ftlFuelConsumption = computed(() =>
    sumBy(flightOrPlan.value?.segments, x => x.ftlFuelConsumption ?? 0),
  );
  const damage = computed(() => sumBy(flightOrPlan.value?.segments, x => x.damage));

  const stlMaterial = computed(() => materialsStore.getByTicker('SF'));

  const ftlMaterial = computed(
    () => blueprint.value?.performance.ftlFuelMaterial as Material | undefined,
  );

  const stlCost = createMaterialAmount(stlMaterial, stlFuelConsumption);
  const ftlCost = createMaterialAmount(ftlMaterial, ftlFuelConsumption);

  const repairCosts = computed(() =>
    damage.value !== undefined && blueprint.value !== undefined
      ? calculateRepairCosts(blueprint.value, damage.value)
      : undefined,
  );
  const stlPricing = createMaterialPrice(stlCost);
  const ftlPricing = createMaterialPrice(ftlCost);
  const repairPricing = createRepairPricing(repairCosts);

  watch(
    computed(
      () =>
        (stlPricing.totalPrice.value ?? 0) +
        (ftlPricing.totalPrice.value ?? 0) +
        (repairPricing.totalPrice.value ?? 0),
    ),
    x => (overallPrice.value = x),
  );

  subscribe($$(table, 'tr'), row => {
    processSummaryRow(
      row,
      segmentColumnIndex,
      damageColumnIndex,
      fuelColumnIndex,
      damage,
      blueprint,
      stlPricing,
      ftlPricing,
      repairPricing,
    );
  });
}

function processSummaryRow(
  row: HTMLTableRowElement,
  segmentColumnIndex: number,
  damageColumnIndex: number,
  fuelColumnIndex: number,
  damage: Ref<number | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
  stlPricing: ReturnType<typeof createMaterialPrice>,
  ftlPricing: ReturnType<typeof createMaterialPrice>,
  repairPricing: ReturnType<typeof createRepairPricing>,
) {
  const segmentIndex = refTextContent(row.children[segmentColumnIndex]);
  if (segmentIndex.value !== '') {
    return;
  }
  const damageCell = row.children[damageColumnIndex];
  const fuelCell = row.children[fuelColumnIndex];

  const stlSpan = fuelCell.firstElementChild?.firstElementChild;

  if (stlSpan) {
    const costSpan = createReactiveSpan(
      stlSpan,
      computed(() =>
        stlPricing.totalPrice.value !== 0
          ? ` ${formatCurrency(stlPricing.totalPrice.value, fixed0)}`
          : undefined,
      ),
    );
    stlSpan.appendChild(costSpan);
  }

  const ftlSpan = fuelCell.firstElementChild?.lastElementChild;

  if (ftlSpan) {
    const costSpan = createReactiveSpan(
      ftlSpan,
      computed(() =>
        ftlPricing.totalPrice.value !== 0
          ? ` ${formatCurrency(ftlPricing.totalPrice.value, fixed0)}`
          : undefined,
      ),
    );
    ftlSpan.appendChild(costSpan);
  }

  createFragmentApp(() => (
    <>
      {blueprint.value !== undefined && damage.value !== undefined && (
        <PrunLink command={`XIT BPRC ${blueprint.value.naturalId} ${damage.value * 100}`}>
          {formatCurrency(repairPricing.totalPrice.value, fixed0)}
        </PrunLink>
      )}
    </>
  )).appendTo(damageCell);
}

function getFlightOrPlan(ship: PrunApi.Ship | undefined, planId: string | null) {
  if (!ship?.flightId) {
    return flightPlansStore.getById(planId);
  }

  return flightsStore.getById(ship.flightId) ?? flightPlansStore.getById(planId);
}

function createRepairPricing(repairs: Ref<PrunApi.MaterialAmount[] | undefined>) {
  const prices = computed(() =>
    repairs.value?.map(repair => {
      const unitPrice = getPrice(repair.material.ticker);

      return {
        ...repair,
        unitPrice,
        totalPrice: (unitPrice ?? 0) * repair.amount,
      };
    }),
  );

  const totalPrice = computed(() => sumBy(prices.value, x => x.totalPrice));

  return {
    prices,
    totalPrice,
  };
}

function createMaterialAmount(
  material: Ref<Material | undefined>,
  amount: Ref<number | undefined>,
) {
  return computed(() => {
    if (!material.value || amount.value === undefined) {
      return undefined;
    }

    return {
      material: material.value,
      amount: amount.value,
    };
  });
}

function createMaterialPrice(materialAmount: Ref<PrunApi.MaterialAmount | undefined>) {
  const unitPrice = computed(() => getPrice(materialAmount.value?.material.ticker));

  const totalPrice = computed(() => {
    if (!materialAmount.value || unitPrice.value === undefined) {
      return undefined;
    }

    return materialAmount.value.amount * unitPrice.value;
  });

  return {
    unitPrice,
    totalPrice,
  };
}

function init() {
  applyLocalizationPatch(L.FuelConsumption.label, () => '{amount, number} {label} {percentage}');
  applyLocalizationPatch(L.FuelUnits.stl, () => 'SF');
  applyLocalizationPatch(L.FuelUnits.ftl, () => 'FF');
  applyLocalizationPatch(L.FuelUnits.vortex, () => 'VF');
  tiles.observe('SFC', onTileReady);
}

features.add(import.meta.url, init, 'SFC: Adds estimated costs to damage and fuel.');
