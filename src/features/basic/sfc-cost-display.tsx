import { refTextContent } from '@src/utils/reactive-dom';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { flightsStore } from '@src/infrastructure/prun-api/data/flights';
import { createReactiveSpan } from '@src/utils/reactive-element';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { blueprintsStore } from '@src/infrastructure/prun-api/data/blueprints';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { calcMaterialAmountPrice } from '@src/infrastructure/fio/cx';
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
  const columnIndices = {
    segment: headers.findIndex(x => x.textContent.includes(L.FlightPlan.index() ?? '#')),
    damage: headers.findIndex(x => x.textContent.includes(L.FlightPlan.damage() ?? 'Damage')),
    fuel: headers.findIndex(x =>
      x.textContent.includes(L.FlightPlan.consumption() ?? 'Consumption'),
    ),
  };

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

  const stlCost = computed(() =>
    stlMaterial.value !== undefined && stlFuelConsumption.value !== undefined
      ? {
          material: stlMaterial.value,
          amount: stlFuelConsumption.value,
        }
      : undefined,
  );
  const ftlCost = computed(() =>
    ftlMaterial.value !== undefined && ftlFuelConsumption.value !== undefined
      ? {
          material: ftlMaterial.value,
          amount: ftlFuelConsumption.value,
        }
      : undefined,
  );

  const repairCosts = computed(() =>
    damage.value !== undefined && blueprint.value !== undefined
      ? calculateRepairCosts(blueprint.value, damage.value)
      : undefined,
  );
  const stlPrice = computed(() =>
    stlCost.value ? calcMaterialAmountPrice(stlCost.value) : undefined,
  );
  const ftlPrice = computed(() =>
    ftlCost.value ? calcMaterialAmountPrice(ftlCost.value) : undefined,
  );
  const repairPrice = computed(() =>
    repairCosts.value ? sumBy(repairCosts.value, x => calcMaterialAmountPrice(x)) : undefined,
  );

  watch(
    computed(() => (stlPrice.value ?? 0) + (ftlPrice.value ?? 0) + (repairPrice.value ?? 0)),
    x => (overallPrice.value = x),
  );

  subscribe($$(table, 'tr'), row => {
    processSummaryRow(row, columnIndices, damage, blueprint, stlPrice, ftlPrice, repairPrice);
  });
}

function processSummaryRow(
  row: HTMLTableRowElement,
  columnIndices: {
    segment: number;
    damage: number;
    fuel: number;
  },
  damage: Ref<number | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
  stlPrice: Ref<number | undefined>,
  ftlPrice: Ref<number | undefined>,
  repairPrice: Ref<number | undefined>,
) {
  const segmentIndex = refTextContent(row.children[columnIndices.segment]);
  if (segmentIndex.value !== '') {
    return;
  }
  const damageCell = row.children[columnIndices.damage];
  const fuelCell = row.children[columnIndices.fuel];

  const stlSpan = fuelCell.firstElementChild?.firstElementChild;

  if (stlSpan) {
    const costSpan = createReactiveSpan(
      stlSpan,
      computed(() =>
        stlPrice.value !== 0 ? ` ${formatCurrency(stlPrice.value, fixed0)}` : undefined,
      ),
    );
    stlSpan.appendChild(costSpan);
  }

  const ftlSpan = fuelCell.firstElementChild?.lastElementChild;

  if (ftlSpan) {
    const costSpan = createReactiveSpan(
      ftlSpan,
      computed(() =>
        ftlPrice.value !== 0 ? ` ${formatCurrency(ftlPrice.value, fixed0)}` : undefined,
      ),
    );
    ftlSpan.appendChild(costSpan);
  }

  createFragmentApp(() => (
    <>
      {blueprint.value !== undefined && damage.value !== undefined && (
        <PrunLink command={`XIT BPRC ${blueprint.value.naturalId} ${damage.value * 100}`}>
          {formatCurrency(repairPrice.value, fixed0)}
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

function init() {
  applyLocalizationPatch(L.FuelConsumption.label, () => '{amount, number} {label} {percentage}');
  applyLocalizationPatch(L.FuelUnits.stl, () => 'SF');
  applyLocalizationPatch(L.FuelUnits.ftl, () => 'FF');
  applyLocalizationPatch(L.FuelUnits.vortex, () => 'VF');
  tiles.observe('SFC', onTileReady);
}

features.add(import.meta.url, init, 'SFC: Adds estimated costs to damage and fuel.');
