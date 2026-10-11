import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { isFiniteOrder } from '@src/core/orders';
import { parse } from 'csv-parse/browser/esm/sync';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';

// CSV Orders Schema:
// Location, Ticker, Type, Username, Quantity, Price

export type PrivateExchange = Map<
  // Location
  string,
  Map<
    // Ticker
    string,
    Map<
      // Type
      'ask' | 'bid',
      {
        username: string;
        quantity: number;
        price: number;
      }[]
    >
  >
>;

type CsvRow = {
  location: string;
  ticker: string;
  type: 'ask' | 'bid';
  username: string;
  quantity: number;
  price: number;
};

export function parseCSVToOrders(csv: string): CsvRow[] | undefined {
  const headers = csv.substring(0, csv.indexOf('\n')).toLowerCase().split(',');
  if (
    !headers.includes('location') ||
    !headers.includes('ticker') ||
    !headers.includes('type') ||
    !headers.includes('username') ||
    !headers.includes('price') ||
    !headers.includes('quantity')
  ) {
    return undefined;
  }
  return parse(csv, {
    columns: header => header.map(x => x.toLowerCase()),
    skipRecordsWithError: true,
    skipEmptyLines: true,
    skipRecordsWithEmptyValues: true,
    cast: (value, context) => {
      if (context.column === 'location') {
        return normalizeLocationName(value);
      }
      if (context.column === 'ticker' || context.column === 'type') {
        return value.toLowerCase();
      }
      if (context.column === 'quantity') {
        return parseInt(value);
      }
      if (context.column === 'price') {
        return parseFloat(value);
      }
      return value;
    },
  });
}

export function normalizeLocationName(location: string): string {
  let normalized = location.trim().toLowerCase();
  switch (normalized) {
    case 'ic1':
    case 'hrt':
    case 'vh-331':
    case 'hortus station':
      normalized = 'Hortus Station';
      break;
    case 'ai1':
    case 'ant':
    case 'zv-307':
    case 'antares station':
      normalized = 'Antares Station';
      break;
    case 'ci1':
    case 'ben':
    case 'uv-351':
    case 'benten station':
      normalized = 'Benten Station';
      break;
    case 'ci2':
    case 'arc':
    case 'am-783':
    case 'arclight station':
      normalized = 'Arclight Station';
      break;
    case 'nc1':
    case 'mor':
    case 'ot-580':
    case 'moria station':
      normalized = 'Moria Station';
      break;
    case 'nc2':
    case 'hub':
    case 'td-203':
    case 'hubur station':
      normalized = 'Hubur Station';
      break;
  }
  return normalized;
}

export function constructExchangeFromOrders(orders: CsvRow[]): PrivateExchange {
  const exchange: PrivateExchange = new Map();
  for (const { location, ticker, type, username, quantity, price } of orders) {
    if (isNaN(quantity) || isNaN(price)) {
      continue;
    }
    if (type !== 'ask' && type !== 'bid') {
      continue;
    }
    const locationMap = exchange.get(location) ?? exchange.set(location, new Map()).get(location)!;
    const tickerMap = locationMap.get(ticker) ?? locationMap.set(ticker, new Map()).get(ticker)!;
    const orders = tickerMap.get(type) ?? tickerMap.set(type, []).get(type)!;
    orders.push({
      username,
      quantity,
      price,
    });
  }
  return exchange;
}

export function pxFromCSV(csv: string): PrivateExchange | undefined {
  const orders = parseCSVToOrders(csv);
  if (orders == undefined) {
    return undefined;
  }
  return constructExchangeFromOrders(orders);
}

export const OrderModes = [
  {
    label: configurableValue,
    value: configurableValue,
  },
  {
    label: 'Full',
    value: 'full',
  },
  {
    label: 'Partial',
    value: 'partial',
  },
  {
    label: 'Backorder',
    value: 'backorder',
  },
];

export const cxCodeContLocationMap: {
  [k: string]: string;
} = {
  'Hortus Station': 'IC1',
  'Antares Station': 'AI1',
  'Benten Station': 'CI1',
  'Arclight Station': 'CI2',
  'Moria Station': 'NC1',
  'Hubur Station': 'NC2',
} as const;

export function contLocationIsCX(location: string) {
  return [
    'hortus station',
    'antares station',
    'moria station',
    'benten station',
    'hubur station',
    'arclight station',
  ].includes(location.toLowerCase());
}

export type FilledByExchange = {
  amount: number;
  priceLimit: number;
  cost: number;
  trades: {
    cx?: boolean;
    username?: string;
    quantity: number;
    price: number;
  }[];
};

type Ask = {
  cx?: boolean;
  username?: string;
  quantity: number;
  price: number;
};

export function fillFromPxCx({
  exchange,
  ignoreStock,
  location,
  cx,
  ticker,
  amount,
  priceLimit,
}: {
  exchange?: PrivateExchange;
  ignoreStock?: boolean;
  location?: string;
  cx?: string;
  ticker: string;
  amount: number;
  priceLimit: number;
}): FilledByExchange | undefined {
  if (!exchange && !cx) {
    return undefined;
  }
  if (exchange && !location) {
    return undefined;
  }

  const asks: Ask[] = [];

  // PX asks
  if (exchange && location) {
    const orders = exchange
      .get(normalizeLocationName(location))
      ?.get(ticker.toLowerCase())
      ?.get('ask');

    for (const { username, quantity, price } of orders ?? []) {
      asks.push({
        username,
        quantity: quantity !== -1 && !ignoreStock ? quantity : Infinity,
        price,
      });
    }
  }

  // CX asks
  if (cx) {
    const orderBook = cxobStore.getByTicker(`${ticker}.${cx}`);

    for (const order of orderBook?.sellingOrders ?? []) {
      asks.push({
        cx: true,
        quantity: isFiniteOrder(order) ? order.amount : Infinity,
        price: order.limit.amount,
      });
    }
  }

  const filled: FilledByExchange = {
    amount: 0,
    priceLimit: 0,
    cost: 0,
    trades: [],
  };

  for (const ask of asks.toSorted((a, b) => a.price - b.price)) {
    if (ask.price > priceLimit || filled.amount >= amount) {
      break;
    }

    const quantity = Math.min(amount - filled.amount, ask.quantity);

    if (quantity <= 0) {
      continue;
    }

    filled.amount += quantity;
    filled.cost += quantity * ask.price;
    filled.priceLimit = Math.max(filled.priceLimit, ask.price);
    filled.trades.push({ ...ask, quantity });
  }

  return filled;
}
