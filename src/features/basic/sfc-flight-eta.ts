import { refTextContent } from '@src/utils/reactive-dom';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { flightsStore, getFlightSegment } from '@src/infrastructure/prun-api/data/flights';
import { formatEta } from '@src/utils/format';
import { timestampEachMinute } from '@src/utils/dayjs';
import { createReactiveSpan } from '@src/utils/reactive-element';
import { keepLast } from '@src/utils/keep-last';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';

function onTileReady(tile: PrunTile) {
  const ship = computed(() => shipsStore.getByRegistration(tile.parameter));
  subscribe($$(tile.anchor, C.MissionPlan.table), x => onTableReady(x, ship));
}

function onTableReady(table: HTMLElement, ship: Ref<PrunApi.Ship | undefined>) {
  const planId = refPrunId(table);
  subscribe($$(table, 'tr'), x => onRowReady(x, ship, planId));
}

function onRowReady(
  row: HTMLElement,
  ship: Ref<PrunApi.Ship | undefined>,
  planId: Ref<string | null>,
) {
  const firstColumn = refTextContent(row.children[0]);
  const arrival = computed(() =>
    getFlightSegmentArrival(ship.value, firstColumn.value, planId.value),
  );
  const eta = computed(() =>
    arrival.value !== undefined
      ? ` (${formatEta(timestampEachMinute.value, arrival.value)})`
      : undefined,
  );
  const span = createReactiveSpan(row, eta);
  keepLast(row, () => row.children[3], span);
}

function getFlightSegmentArrival(
  ship: PrunApi.Ship | undefined,
  index: string | null,
  planId: string | null,
) {
  return getFlightSegment(ship, index, planId)?.arrival.timestamp;
}

function init() {
  tiles.observe('SFC', onTileReady);
}

features.add(import.meta.url, init, 'SFC: Adds an arrival date to the "Duration" column.');
