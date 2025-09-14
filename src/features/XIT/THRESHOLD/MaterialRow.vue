<script setup lang="ts">
import { fixed0 } from '@src/utils/format.ts';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { MaterialThreshold } from '@src/core/threshold.ts';
import NumberInput from '@src/components/forms/NumberInput.vue';
import Active from '@src/components/forms/Active.vue';
import NumericInput from '@src/components/forms/NumericInput.vue';

const { alwaysVisible, threshold, material } = defineProps<{
  alwaysVisible?: boolean;
  threshold: MaterialThreshold;
  material: PrunApi.Material;
}>();

const invAmount = computed(() => threshold.inventory ?? 0);
const thresholdAmount = computed(() => threshold.threshold ?? 0);

const isVisible = computed(() => {
  if (alwaysVisible) {
    return true;
  }
  return true;
});

const excessAmt = computed(() => {
  let excess = Math.ceil(invAmount.value - thresholdAmount.value);
  // This check is needed to prevent a "-0" value that can happen
  // in situations like: 0 * -0.25 => -0.
  excess = excess === 0 ? 0 : excess;
  return excess;
});
</script>

<template>
  <tr v-if="isVisible">
    <td :class="$style.materialContainer">
      <MaterialIcon size="inline-table" :ticker="material.ticker" />
    </td>
    <td>
      <span>{{ fixed0(invAmount) }}</span>
    </td>
    <td>
      <form>
        <Active label="Threshold">
          <NumericInput v-model="threshold.threshold" />
        </Active>
      </form>
    </td>
    <td>
      <span>{{ fixed0(excessAmt) }}</span>
    </td>
  </tr>
</template>

<style module>
.materialContainer {
  width: 32px;
  padding: 0;
}
</style>
