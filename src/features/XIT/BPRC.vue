<script setup lang="ts">
import MaterialPurchaseTable from '@src/components/MaterialPurchaseTable.vue';
import { useTileState } from '@src/store/user-data-tiles';
import Active from '@src/components/forms/Active.vue';
import { useXitParameters } from '@src/hooks/use-xit-parameters';
import { calculateRepairCosts } from '@src/core/ship-repair';
import { blueprintsStore } from '@src/infrastructure/prun-api/data/blueprints';
import SelectInput from '@src/components/forms/SelectInput.vue';
import NumericInput from '@src/components/forms/NumericInput.vue';

const parameters = useXitParameters();

const blueprintOptions = computed(
  () =>
    blueprintsStore.all.value?.map(x => ({
      label: x.name ? x.name : x.naturalId,
      value: x.naturalId,
    })) ?? [],
);

const blueprintNaturalId = useTileState(
  'blueprintNaturalId',
  parameters.find(x => x.toLowerCase().startsWith('bp')),
);

const damage = useTileState('damage', +(parameters.find(x => !Number.isNaN(+x)) ?? 20));

const threshold = useTileState('threshold', 80);

const blueprint = computed(() =>
  blueprintNaturalId.value ? blueprintsStore.getByNaturalId(blueprintNaturalId.value) : undefined,
);

const repairCosts = computed(() =>
  blueprint.value !== undefined ? calculateRepairCosts(blueprint.value, damage.value / 100) : [],
);
// The NumericInputs warn about non-NaN strings when you try to use a formula.
// I'm not sure how to get around this.
</script>

<template>
  <form>
    <Active label="Blueprint">
      <SelectInput v-model="blueprintNaturalId" :options="blueprintOptions" />
    </Active>
    <Active label="Damage">
      <NumericInput
        :model-value="damage"
        @input="
          damage =
            $event.target.value === ''
              ? 0
              : isNaN(+$event.target.value)
                ? $event.target.value
                : +$event.target.value
        " />
    </Active>
    <Active label="Repair threshold">
      <NumericInput
        :model-value="threshold"
        @input="
          damage =
            $event.target.value === ''
              ? 0
              : isNaN(+$event.target.value)
                ? $event.target.value
                : +$event.target.value
        " />
    </Active>
  </form>
  <MaterialPurchaseTable :precise-materials="true" :materials="repairCosts" />
</template>

<style module></style>
