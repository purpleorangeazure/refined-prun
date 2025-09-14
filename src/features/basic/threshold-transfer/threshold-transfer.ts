import $style from './threshold-transfer.module.css';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers.ts';

function init() {
  applyCssRule(`.${C.MaterialIcon.indicatorContainer}`, $style.quantity);
  subscribe($$(document, C.MaterialIcon.container), container => {
    container.querySelector(C.MaterialIcon.indicator)!.addEventListener('click', () => {
      const invId: string = container.closest(C.TileFrame.cmd)?.textContent.split(' ')[1] ?? '';
      return showBuffer(`XIT THRESHOLD ${invId}`);
    });
  });
}

features.add(
  import.meta.url,
  init,
  'Enables setting a threshold for material transfers to maintain a certain quantity.',
);
