import { refTextContent } from '@src/utils/reactive-dom';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { flightsStore, getFlightSegment } from '@src/infrastructure/prun-api/data/flights';
import { createReactiveSpan } from '@src/utils/reactive-element';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { blueprintsStore } from '@src/infrastructure/prun-api/data/blueprints';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import Material = PrunApi.Material;
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { getPrice } from '@src/infrastructure/fio/cx';
import { fixed02, formatCurrency } from '@src/utils/format';
import { sumBy } from '@src/utils/sum-by';
import { flightPlansStore } from '@src/infrastructure/prun-api/data/flight-plans';
import { calculateRepairCosts } from '@src/core/ship-repair';

function onTileReady(tile: PrunTile) {
  const ship = computed(() => shipsStore.getByRegistration(tile.parameter));
  const blueprint = computed(() => blueprintsStore.getByNaturalId(ship.value?.blueprintNaturalId));
  void prepareBlueprintFetchButton(tile, ship, blueprint);
  subscribe($$(tile.anchor, C.MissionPlan.table), x => onTableReady(x, ship, blueprint));
}

async function prepareBlueprintFetchButton(
  tile: PrunTile,
  ship: Ref<PrunApi.Ship | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
) {
  const cmdRow = await $(tile.anchor, C.FormComponent.containerCommand);
  const inputContainer = await $(cmdRow, C.FormComponent.input);
  createFragmentApp(() => (
    <span>
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
      )}
    </span>
  )).prependTo(inputContainer);
}

async function onTableReady(
  table: HTMLElement,
  ship: Ref<PrunApi.Ship | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
) {
  const planId = refPrunId(table);
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
  subscribe($$(table, 'tr'), x =>
    onRowReady(x, ship, planId, blueprint, segmentColumnIndex, damageColumnIndex, fuelColumnIndex),
  );
}

function onRowReady(
  row: HTMLElement,
  ship: Ref<PrunApi.Ship | undefined>,
  planId: Ref<string | null>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
  segmentColumnIndex: number,
  damageColumnIndex: number,
  fuelColumnIndex: number,
) {
  const segmentIndex = refTextContent(row.children[segmentColumnIndex]);
  const damageCell = row.children[damageColumnIndex];
  const fuelCell = row.children[fuelColumnIndex];
  const flightOrPlan = computed(() =>
    ship.value?.flightId !== undefined
      ? (flightsStore.getById(ship.value.flightId) ?? flightPlansStore.getById(planId.value))
      : flightPlansStore.getById(planId.value),
  );
  const stlFuelConsumption = computed(() =>
    segmentIndex.value !== ''
      ? (getFlightSegment(ship.value, segmentIndex.value, planId.value)?.stlFuelConsumption ??
        undefined)
      : sumBy(flightOrPlan.value?.segments, x => x.stlFuelConsumption ?? 0),
  );
  const ftlFuelConsumption = computed(() =>
    segmentIndex.value !== ''
      ? (getFlightSegment(ship.value, segmentIndex.value, planId.value)?.ftlFuelConsumption ??
        undefined)
      : sumBy(flightOrPlan.value?.segments, x => x.ftlFuelConsumption ?? 0),
  );
  const damage = computed(() =>
    segmentIndex.value !== ''
      ? getFlightSegment(ship.value, segmentIndex.value, planId.value)?.damage
      : sumBy(flightOrPlan.value?.segments, x => x.damage),
  );
  const stlFuel = materialsStore.getByTicker('SF');
  const ftlFuel = computed(
    () => blueprint.value?.performance['ftlFuelMaterial'] as Material | undefined,
  );
  const stlCost = computed<PrunApi.MaterialAmount | undefined>(() => {
    if (stlFuel !== undefined && stlFuelConsumption.value !== undefined) {
      return {
        material: stlFuel,
        amount: stlFuelConsumption.value,
      };
    }
    return undefined;
  });
  const ftlCost = computed<PrunApi.MaterialAmount | undefined>(() => {
    if (ftlFuel.value !== undefined && ftlFuelConsumption.value !== undefined) {
      return {
        material: ftlFuel.value,
        amount: ftlFuelConsumption.value,
      };
    }
    return undefined;
  });
  const repairCosts = computed(() =>
    damage.value !== undefined && blueprint.value !== undefined
      ? calculateRepairCosts(blueprint.value, damage.value)
      : undefined,
  );

  if (stlCost.value !== undefined) {
    const span = fuelCell.firstElementChild?.firstElementChild;
    const unitPrice = computed(() => getPrice(stlCost.value?.material.ticker));
    const totalPrice = computed(() => (stlCost.value?.amount ?? 0) * (unitPrice.value ?? 0));
    if (span) {
      const costSpan = createReactiveSpan(
        span,
        computed(() => formatCurrency(totalPrice.value, fixed02)),
      );
      span.appendChild(costSpan);
    }
  }
  if (ftlCost.value !== undefined) {
    const span = fuelCell.firstElementChild?.lastElementChild;
    const unitPrice = computed(() => getPrice(ftlCost.value?.material.ticker));
    const totalPrice = computed(() => (ftlCost.value?.amount ?? 0) * (unitPrice.value ?? 0));
    if (span) {
      const costSpan = createReactiveSpan(
        span,
        computed(() => formatCurrency(totalPrice.value, fixed02)),
      );
      span.appendChild(costSpan);
    }
  }
  if (repairCosts.value !== undefined) {
    const span = damageCell;
    const prices = computed(() =>
      repairCosts.value?.map(x => ({
        material: x.material,
        amount: x.amount,
        unitPrice: getPrice(x.material.ticker),
        totalPrice: (getPrice(x.material.ticker) ?? 0) * x.amount,
      })),
    );
    const totalPrice = computed(() => sumBy(prices.value, x => x.totalPrice));
    const costSpan = createReactiveSpan(
      span,
      computed(() => formatCurrency(totalPrice.value, fixed02)),
    );
    span.appendChild(costSpan);
  }
}

function init() {
  tiles.observe('SFC', onTileReady);
}

features.add(import.meta.url, init, 'SFC: Adds estimated costs to damage and fuel.');
