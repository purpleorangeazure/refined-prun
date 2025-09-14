import $style from './threshold-transfer.module.css';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers.ts';
import { companyStore } from '@src/infrastructure/prun-api/data/company.ts';

function init() {
  applyCssRule(`.${C.MaterialIcon.indicatorContainer}`, $style.quantity);
  subscribe($$(document, C.MaterialIcon.indicatorContainer), indicator => {
    indicator.addEventListener('click', () => showBuffer(`CO ${companyStore.value?.code}`));
  });
}

features.add(
  import.meta.url,
  init,
  'Enables setting a threshold for material transfers to maintain a certain quantity.',
);
