<script setup lang="ts">
import { useXitParameters } from '@src/hooks/use-xit-parameters.ts';
import { isEmpty } from 'ts-extras';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites.ts';
import LoadingSpinner from '@src/components/LoadingSpinner.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import Tooltip from '@src/components/Tooltip.vue';
import { useTileState } from '@src/features/XIT/BURN/tile-state.ts';
import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses.ts';
import MaterialRow from '@src/features/XIT/THRESHOLD/MaterialRow.vue';
import { MaterialThreshold } from '@src/core/threshold.ts';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials.ts';

const parameters = useXitParameters();
const isThresholdAll = isEmpty(parameters) || parameters[0].toLowerCase() == 'all';

const sites = computed(() => {
  if (isThresholdAll) {
    return sitesStore.all.value;
  }

  return parameters.map(x => sitesStore.getByPlanetNaturalIdOrName(x)).filter(x => x !== undefined);
});

const expand = useTileState('expand');

const anyExpanded = computed(() => expand.value.length > 0);

function onExpandAllClick() {
  if (expand.value.length > 0) {
    expand.value = [];
  } else {
    expand.value = sites.value?.map(x => getEntityNaturalIdFromAddress(x.address) ?? '') ?? [];
  }
}

const rat = materialsStore.getByTicker('RAT');

const fakeThreshold: MaterialThreshold = {
  threshold: 0,
  inventory: 0,
};
</script>

<template>
  <LoadingSpinner v-if="sites === undefined" />
  <template v-else>
    <table>
      <thead>
        <tr>
          <th v-if="sites.length > 0" :class="$style.expand" @click="onExpandAllClick">
            {{ anyExpanded ? '-' : '+' }}
          </th>
          <th v-else />
          <th>Inv</th>
          <th>
            <div :class="$style.header">
              Threshold
              <Tooltip
                position="bottom"
                tooltip="How much of a material should be withheld during transfers." />
            </div>
          </th>
          <th>
            <div :class="$style.header">
              Excess
              <Tooltip position="bottom" tooltip="How much of a material should be transferred." />
            </div>
          </th>
        </tr>
      </thead>
      <tbody :class="$style.fakeRow">
        <MaterialRow always-visible :threshold="fakeThreshold" :material="rat!" />
      </tbody>
    </table>
  </template>
</template>

<style module>
.fakeRow {
  visibility: visible;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.expand {
  text-align: center;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  padding-left: 18px;
  font-weight: bold;
}
</style>
