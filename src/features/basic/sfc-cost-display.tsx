import { refTextContent } from '@src/utils/reactive-dom';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { flightsStore } from '@src/infrastructure/prun-api/data/flights';
import { createReactiveSpan } from '@src/utils/reactive-element';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { blueprintsStore } from '@src/infrastructure/prun-api/data/blueprints';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import Material = PrunApi.Material;
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { getPrice } from '@src/infrastructure/fio/cx';
import { fixed0, formatCurrency } from '@src/utils/format';
import { sumBy } from '@src/utils/sum-by';
import { flightPlansStore } from '@src/infrastructure/prun-api/data/flight-plans';
import { calculateRepairCosts } from '@src/core/ship-repair';
import PrunLink from '@src/components/PrunLink.vue';

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
  const flightOrPlan = computed(() =>
    ship.value?.flightId !== undefined
      ? (flightsStore.getById(ship.value.flightId) ?? flightPlansStore.getById(planId.value))
      : flightPlansStore.getById(planId.value),
  );
  const headerRow = await $(table, 'thead');
  if (!headerRow.firstElementChild) {
    return;
  }
  const headers = Array.from(headerRow.firstElementChild.children);
  const segmentColumnIndex = headers.findIndex(x =>
    x.textContent.includes(L.FlightPlan.index() ?? '#'),
  );
  const destinationColumnIndex = headers.findIndex(x =>
    x.textContent.includes(L.FlightPlan.destination() ?? 'Destination'),
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

  const stlCost = computed<PrunApi.MaterialAmount | undefined>(() => {
    const stlFuel = materialsStore.getByTicker('SF');
    if (stlFuel !== undefined && stlFuelConsumption.value !== undefined) {
      return {
        material: stlFuel,
        amount: stlFuelConsumption.value,
      };
    }
    return undefined;
  });
  const ftlCost = computed<PrunApi.MaterialAmount | undefined>(() => {
    const ftlFuel = blueprint.value?.performance['ftlFuelMaterial'] as Material | undefined;
    if (ftlFuel !== undefined && ftlFuelConsumption.value !== undefined) {
      return {
        material: ftlFuel,
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

  subscribe($$(table, 'tr'), row => {
    const segmentIndex = refTextContent(row.children[segmentColumnIndex]);
    if (segmentIndex.value !== '') {
      return;
    }
    const destinationCell = row.children[destinationColumnIndex];
    const damageCell = row.children[damageColumnIndex];
    const fuelCell = row.children[fuelColumnIndex];

    const stlSpan = fuelCell.firstElementChild?.firstElementChild;
    const stlUnitPrice = computed(() => getPrice(stlCost.value?.material.ticker));
    const stlTotalPrice = computed(() =>
      stlCost.value !== undefined && stlUnitPrice.value !== undefined
        ? stlCost.value?.amount * stlUnitPrice.value
        : undefined,
    );
    if (stlSpan) {
      const costSpan = createReactiveSpan(
        stlSpan,
        computed(() =>
          stlTotalPrice.value !== 0 ? ` ${formatCurrency(stlTotalPrice.value, fixed0)}` : undefined,
        ),
      );
      stlSpan.appendChild(costSpan);
    }

    const ftlSpan = fuelCell.firstElementChild?.lastElementChild;
    const ftlUnitPrice = computed(() => getPrice(ftlCost.value?.material.ticker));
    const ftlTotalPrice = computed(() =>
      ftlCost.value !== undefined && ftlUnitPrice.value !== undefined
        ? ftlCost.value?.amount * ftlUnitPrice.value
        : undefined,
    );
    if (ftlSpan) {
      const costSpan = createReactiveSpan(
        ftlSpan,
        computed(() =>
          ftlTotalPrice.value !== 0 ? ` ${formatCurrency(ftlTotalPrice.value, fixed0)}` : undefined,
        ),
      );
      ftlSpan.appendChild(costSpan);
    }

    const damageSpan = damageCell;
    const repairPrices = computed(() =>
      repairCosts.value?.map(x => ({
        material: x.material,
        amount: x.amount,
        unitPrice: getPrice(x.material.ticker),
        totalPrice: (getPrice(x.material.ticker) ?? 0) * x.amount,
      })),
    );
    const repairTotalPrice = computed(() => sumBy(repairPrices.value, x => x.totalPrice));
    createFragmentApp(() => (
      <>
        {blueprint.value !== undefined && damage.value !== undefined && (
          <PrunLink command={`XIT BPRC ${blueprint.value.naturalId} ${damage.value * 100}`}>
            {formatCurrency(repairTotalPrice.value, fixed0)}
          </PrunLink>
        )}
      </>
    )).appendTo(damageSpan);

    const overallPrice = computed(
      () => (stlTotalPrice.value ?? 0) + (ftlTotalPrice.value ?? 0) + (repairTotalPrice.value ?? 0),
    );

    const overallSpan = createReactiveSpan(
      destinationCell,
      computed(() =>
        ftlTotalPrice.value !== 0 ? `${formatCurrency(overallPrice.value, fixed0)} ` : undefined,
      ),
    );
    destinationCell.prepend(overallSpan);
  });
}

function init() {
  applyLocalizationPatch(L.FuelConsumption.label, () => '{amount, number} {label} {percentage}');
  applyLocalizationPatch(L.FuelUnits.stl, () => 'SF');
  applyLocalizationPatch(L.FuelUnits.ftl, () => 'FF');
  applyLocalizationPatch(L.FuelUnits.vortex, () => 'VF');
  tiles.observe('SFC', onTileReady);
}

features.add(import.meta.url, init, 'SFC: Adds estimated costs to damage and fuel.');
