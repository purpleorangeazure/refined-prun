import { getPrunId } from '@src/infrastructure/prun-ui/attributes';
import { localAdsStore } from '@src/infrastructure/prun-api/data/local-ads';

import fa from '@src/utils/font-awesome.module.css';
import $style from './lm-shpt-capacity-indicator.module.css';

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, C.CommodityAd.container), onAdContainerReady);
}

function niceRatio(a: number, b: number): string {
  const r = a / b;

  if (r >= 1) {
    const rounded = Math.round(r);
    if (Math.abs(r - rounded) < 0.05 && rounded <= 9) return `${rounded}:1`;
  } else {
    const inv = Math.round(1 / r);
    if (Math.abs(1 / r - inv) < 0.05 && inv <= 9) return `1:${inv}`;
  }

  const max = Math.max(a, b);
  const scale = 9 / max;

  return `${Math.round(a * scale)}:${Math.round(b * scale)}`;
}

async function onAdContainerReady(container: HTMLElement) {
  const element = await $(container, C.CommodityAd.text);
  const id = getPrunId(container);
  const ad = localAdsStore.getById(id);
  if (!ad || ad.type !== 'COMMODITY_SHIPPING') {
    return;
  }

  const weight = ad.cargoWeight ?? 0;
  const volume = ad.cargoVolume ?? 0;
  if (weight === 0 && volume === 0) {
    return;
  }

  const ratio = niceRatio(weight, volume);

  let icon: string;

  if (ratio == '1:1') {
    icon = '=';
  } else if (weight > volume) {
    icon = '\uf5cd';
  } else {
    icon = '\uf5fd';
  }

  createFragmentApp(() => (
    <span class={$style.indicator}>
      <span class={fa.solid}>{icon}</span> {ratio}
    </span>
  )).before(element);
}

function init() {
  tiles.observe(['LM', 'LMA'], onTileReady);
}

features.add(import.meta.url, init, 'LM: Adds a volume/weight ratio indicator to SHPT ads.');
