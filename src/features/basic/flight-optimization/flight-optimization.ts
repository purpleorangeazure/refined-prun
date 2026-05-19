import { refAttributeValue, refTextContent } from '@src/utils/reactive-dom';
import FlightStats from '@src/features/basic/flight-optimization/FlightStats.vue';

const STL_TYPES = ['DEP', 'APP', 'TRA'];
const FTL_TYPES = ['JMP'];

async function onTileReady(tile: PrunTile) {
  const flightData: {
    type: string;
    fuelFactor: number;
    timeSec: number;
  }[] = [];
  subscribe($$(tile.anchor, C.MissionPlan.table), async missionPlan => {
    const flightSegmentTable = missionPlan.lastElementChild as HTMLTableSectionElement;
    if (flightSegmentTable === null) {
      return;
    }
    subscribe($$(flightSegmentTable, 'tr'), async row => {
      const type = row.children[1].textContent;
      if (!STL_TYPES.includes(type) && !FTL_TYPES.includes(type)) {
        return;
      }
      if (STL_TYPES.includes(type)) {
        const timeText = refTextContent(row.children[3].firstElementChild!);
        const distanceText = refTextContent(row.children[4]);
        const fuelText = refTextContent(row.children[7].firstElementChild!.firstElementChild!);

        const timeSec = computed(() =>
          timeText.value ? parseTimeToSeconds(timeText.value.trim()) : 0,
        );
        const distanceKm = computed(() =>
          distanceText.value ? parseFloat(distanceText.value.replace(/\D/g, '')) : 0,
        );
        const stlFuel = computed(() =>
          fuelText.value ? parseFloat(fuelText.value.replace(/\D/g, '')) : 0,
        );
        flightData.push({
          type,
          timeSec: timeSec.value,
          fuelFactor: stlFuel.value,
        });
        console.log(flightData);

        createFragmentApp(
          FlightStats,
          reactive({
            timeSec,
            distanceKm,
            stlFuel,
          }),
        ).appendTo(row);
      }
    });
  });
}

function parseTimeToSeconds(str: string) {
  const days = Number(str.match(/(\d+)d/)?.[1] ?? 0);
  const hours = Number(str.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(str.match(/(\d+)m/)?.[1] ?? 0);
  const seconds = Number(str.match(/(\d+)s/)?.[1] ?? 0);

  return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds;
}

function init() {
  tiles.observe(['BTF', 'SFC'], onTileReady);
}

features.add(import.meta.url, init, 'BTF, SFC: Adds stats to flight segments.');
