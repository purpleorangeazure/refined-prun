<script setup lang="ts">
import Active from '@src/components/forms/Active.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { Config } from '@src/features/XIT/ACT/actions/px-buy/config';
import TextInput from '@src/components/forms/TextInput.vue';
import { parse } from 'csv-parse/sync';
import PrunButton from '@src/components/PrunButton.vue';

const { data, config } = defineProps<{ data: UserData.ActionData; config: Config }>();

const fallbackOptions = [{ label: 'OFF', value: '' }, 'AI1', 'CI1', 'IC1', 'NC1', 'CI2', 'NC2'];

config.skip ??= false;
config.exchangeName ??= '';
config.exchangeUrl ??= '';
config.ignoreStock ??= false;
config.fallbackCx ??= '';

const pxState = ref<'UNKNOWN' | 'VALIDATING' | 'INVALID' | 'VALID'>('UNKNOWN');

const testPx = async (url: string): Promise<undefined | number> => {
  pxState.value = 'VALIDATING';
  const res = await fetch(url);
  try {
    const text = await res.text();
    const rows = parse(text, {
      columns: false,
      skipRecordsWithError: true,
      skipEmptyLines: true,
      skipRecordsWithEmptyValues: true,
    });
    if (rows.every(x => x.length == 4)) {
      pxState.value = 'VALID';
      return rows.length;
    }
  } catch {
    pxState.value = 'INVALID';
    return undefined;
  }
  pxState.value = 'INVALID';
  return undefined;
};
</script>

<template>
  <form>
    <Active
      v-if="data.skippable"
      label="Skip PX Buy"
      tooltip="Whether to skip purchasing materials and only perform the transfer.">
      <RadioItem v-model="config.skip">skip px buy</RadioItem>
    </Active>
    <Active
      v-if="!config.skip"
      label="Private Exchange Name"
      tooltip="A custom name to identify the PX.">
      <TextInput v-model="config.exchangeName" />
    </Active>
    <Active
      v-if="!config.skip"
      label="Private Exchange URL"
      tooltip="A csv file that contains PX sell offers as [Username, Ticker, Quantity, Price]."
      :error="pxState === 'INVALID'">
      <TextInput v-model="config.exchangeUrl" @change="pxState = 'UNKNOWN'" />
      <PrunButton :disabled="!config.exchangeUrl" @click="testPx(config.exchangeUrl!)"
        >TEST</PrunButton
      >
    </Active>
    <Active
      v-if="!config.skip"
      label="Ignore PX Stock"
      tooltip="Whether to send purchase contracts regardless of a merchant's posted stock.">
      <RadioItem v-model="config.ignoreStock">ignore px stock</RadioItem>
    </Active>
    <Active
      v-if="!config.skip"
      label="Fallback CX"
      tooltip="CX to use for purchasing materials not available on the PX">
      <SelectInput v-model="config.fallbackCx" :options="fallbackOptions" />
    </Active>
  </form>
</template>
