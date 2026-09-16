import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { flightsStore } from '@src/infrastructure/prun-api/data/flights';
import { flightPlansStore } from '@src/infrastructure/prun-api/data/flight-plans';
import { getPrice } from '@src/infrastructure/fio/cx';
import { fixed0, formatCurrency } from '@src/utils/format';
import { createReactiveDiv } from '@src/utils/reactive-element';
import { keepLast } from '@src/utils/keep-last';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { ElementTag } from '@src/infrastructure/prun-ui/tagger';
import { calculateRepairCosts } from '@src/core/ship-repair';
import { blueprintsStore } from '@src/infrastructure/prun-api/data/blueprints';
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';

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
          CALCULATE REPAIR
        </PrunButton>
      )}{' '}
    </>
  )).prependTo(inputContainer);
}

function onTableReady(
  table: HTMLElement,
  ship: Ref<PrunApi.Ship | undefined>,
  blueprint: Ref<PrunApi.Blueprint | undefined>,
) {
  const planId = refPrunId(table);
  const fuelCost = computed(() => getFuelCost(ship.value, planId.value));
  const repairCost = computed(() => getRepairCost(ship.value, blueprint.value, planId.value));
  const feesCost = computed(() => {
    if (ship.value?.flightId) {
      return undefined;
    }
    const fees = flightPlansStore.getById(planId.value)?.costs;
    return sumBy(fees ?? [], x => x.amount);
  });
  const totalCost = computed(
    () => (fuelCost.value ?? 0) + (repairCost.value ?? 0) + (feesCost.value ?? 0),
  );
  const text = computed(() => {
    return `Cost: ${formatCurrency(totalCost.value)}${repairCost.value === undefined ? '*' : ''}`;
  });
  const tooltip = computed(() => {
    const lines: string[] = [];
    if (fuelCost.value === undefined) {
      lines.push('Fuel cost unknown');
    } else if (fuelCost.value > 0) {
      lines.push(
        `Fuel cost: ${formatCurrency(fuelCost.value)} (${fixed0((fuelCost.value / totalCost.value) * 100)}%)`,
      );
    }
    if (repairCost.value === undefined) {
      lines.push('Repair cost unknown');
    } else if (repairCost.value > 0) {
      lines.push(
        `Repair cost: ${formatCurrency(repairCost.value)} (${fixed0((repairCost.value / totalCost.value) * 100)}%)`,
      );
    }
    if (feesCost.value === undefined) {
      lines.push('Fees cost unknown');
    } else if (feesCost.value > 0) {
      lines.push(
        `Fees cost: ${formatCurrency(feesCost.value)} (${fixed0((feesCost.value / totalCost.value) * 100)}%)`,
      );
    }
    return lines.join('\n');
  });

  subscribe($$(table, C.MissionPlan.stats), stats => {
    subscribe($$(stats, ElementTag.SFC_CONSUMPTION_CELL), cell => {
      const div = createReactiveDiv(cell, text);
      div.setAttribute('data-tooltip', tooltip.value);
      div.style.whiteSpace = 'pre-wrap';
      keepLast(cell, () => cell, div);
    });
  });
}

function getFuelCost(ship: PrunApi.Ship | undefined, planId: string | null) {
  const segments = getSegments(ship, planId);
  if (segments === undefined) {
    return undefined;
  }

  let sf = 0;
  let ff = 0;
  for (const segment of segments) {
    sf += segment.stlFuelConsumption ?? 0;
    ff += segment.ftlFuelConsumption ?? 0;
  }

  const sfCost = getTickerAmountCost('SF', sf);
  const ffCost = getTickerAmountCost('FF', ff);
  if (sfCost === undefined || ffCost === undefined) {
    return undefined;
  }

  return sfCost + ffCost;
}

function getTickerAmountCost(ticker: string, amount: number) {
  if (amount === 0) {
    return 0;
  }

  const price = getPrice(ticker);
  return price === undefined ? undefined : amount * price;
}

function getRepairCost(
  ship: PrunApi.Ship | undefined,
  blueprint: PrunApi.Blueprint | undefined,
  planId: string | null,
) {
  if (ship === undefined) {
    return undefined;
  }
  const segments = getSegments(ship, planId);
  if (segments === undefined) {
    return undefined;
  }
  const damage = sumBy(segments, x => x.damage);
  if (blueprint === undefined) {
    return undefined;
  }
  const repairBill = calculateRepairCosts(blueprint, damage);
  return sumBy(
    repairBill.map(x => getTickerAmountCost(x.material.ticker, x.amount)),
    x => x,
  );
}

function getSegments(ship: PrunApi.Ship | undefined, planId: string | null) {
  if (!ship) {
    return undefined;
  }

  if (ship.flightId) {
    return flightsStore.getById(ship.flightId)?.segments;
  }

  return flightPlansStore.getById(planId)?.segments;
}

function init() {
  tiles.observe('SFC', onTileReady);
}

features.add(import.meta.url, init, 'SFC: Shows flight cost, including fees and fuel.');
