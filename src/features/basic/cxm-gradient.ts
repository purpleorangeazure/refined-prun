import { refTextContent } from '@src/utils/reactive-dom';

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, 'table'), x => onTableReady(x));
}

function onTableReady(table: HTMLTableElement) {
  const prices: Ref<Map<number, ComputedRef<number>>> = ref(new Map());
  subscribe($$(table, C.ComExMaterialInfo.current), x => {
    const rowIndex = x.closest('tr')!.rowIndex;
    const cell = x.closest('td')!;

    const price = computed(() => {
      const priceCellText = refTextContent(x);
      if (priceCellText.value == null) return NaN;
      return parseFloat(priceCellText.value);
    });

    watchEffect(() => {
      const validPrices = computed(() =>
        [...prices.value.values()].filter(p => !isNaN(p.value)).map(p => p.value),
      );
      const min = Math.min(...validPrices.value);
      const max = Math.max(...validPrices.value);
      const color = getColor(price.value, min, max);
      console.log(price.value, min, max, color);
      cell.ariaDescription = `${price.value}\n${min} ${max}`;
      cell.style.backgroundColor = color;
    });

    prices.value = prices.value.set(rowIndex, price);
  });
}

function getColor(value: number, min: number, max: number): `hsl(${string})` {
  if (max === min) return 'hsl(0, 100%, 50%)';
  const clamped = Math.min(Math.max(value, min), max);
  const ratio = (clamped - min) / (max - min);
  const hue = 120 - ratio * 120;

  return `hsl(${hue}, 40%, 30%)`;
}

function init() {
  tiles.observe('CXM', onTileReady);
}

features.add(import.meta.url, init, 'CXM: Adds a gradient to the price column.');
