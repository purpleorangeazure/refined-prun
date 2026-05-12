<script setup lang="ts">
import { fixed02 } from '@src/utils/format';

const { distanceKm, timeSec, stlFuel } = defineProps<{
  distanceKm: number;
  timeSec: number;
  stlFuel: number;
}>();

const speedKms = computed(() => distanceKm / timeSec);
const fuelPerKms = computed(() => stlFuel / speedKms.value);
</script>

<template>
  <div>{{ fixed02(speedKms) }} km/s</div>
  <div>{{ fixed02(fuelPerKms * 1000) }} mSF/km/s</div>
</template>
