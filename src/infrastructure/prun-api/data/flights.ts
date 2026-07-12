import { createEntityStore } from '@src/infrastructure/prun-api/data/create-entity-store';
import { onApiMessage } from '@src/infrastructure/prun-api/data/api-messages';
import { flightPlansStore } from '@src/infrastructure/prun-api/data/flight-plans';

const store = createEntityStore<PrunApi.Flight>();
const state = store.state;

onApiMessage({
  SHIP_FLIGHT_FLIGHTS(data: { flights: PrunApi.Flight[] }) {
    store.setAll(data.flights);
    store.setFetched();
  },
  SHIP_FLIGHT_FLIGHT(data: PrunApi.Flight) {
    store.setOne(data);
  },
  SHIP_FLIGHT_FLIGHT_ENDED(data: PrunApi.Flight) {
    store.removeOne(data.id);
  },
});

export const flightsStore = {
  ...state,
};

export function getFlightSegment(
  ship: PrunApi.Ship | undefined,
  index: string | null,
  planId: string | null,
) {
  if (!ship || index === null) {
    return undefined;
  }

  let segments: PrunApi.FlightSegment[];

  if (ship.flightId) {
    const flight = flightsStore.getById(ship.flightId);
    if (!flight) {
      return undefined;
    }

    segments = flight.segments;
  } else {
    const plan = flightPlansStore.getById(planId);
    if (!plan) {
      return undefined;
    }

    segments = plan.segments;
  }

  const segmentId = index !== '' ? parseInt(index, 10) : segments.length - 1;
  if (isFinite(segmentId) && segmentId < segments.length) {
    return segments[segmentId];
  }

  return undefined;
}
