import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/actions/px-buy/Edit.vue';
import Configure from '@src/features/XIT/ACT/actions/px-buy/Configure.vue';
import { Config } from '@src/features/XIT/ACT/actions/px-buy/config';
import { CXPO_BUY } from '@src/features/XIT/ACT/action-steps/CXPO_BUY';
import {
  contLocationIsCX,
  cxCodeContLocationMap,
  fillFromPxCx,
  normalizeLocationName,
  type PrivateExchange,
  pxFromCSV,
} from '@src/features/XIT/ACT/actions/px-buy/utils';
import { AssertFn, configurableValue } from '@src/features/XIT/ACT/shared-types';
import { userData } from '@src/store/user-data';
import { resolveLocation } from '@src/features/XIT/ACT/actions/cont-locations';
import { CONT_TRADE } from '@src/features/XIT/ACT/action-steps/CONT_TRADE';
import { fixed0 } from '@src/utils/format';

act.addAction<Config>({
  type: 'PX Buy',
  shortDescription: 'Buy materials from a private exchange',
  description: (action, config) => {
    if (!action.group || !action.contLocation || !action.exchangeUrl) {
      return '--';
    }

    const contLocation =
      action.contLocation === configurableValue
        ? (config?.contLocation ?? 'configured exchange')
        : action.contLocation;
    return `Buying group ${action.group} from ${contLocation} using ${action.exchangeUrl}`;
  },
  editComponent: Edit,
  configureComponent: Configure,
  needsConfigure: data =>
    data.contLocation === configurableValue || data.orderMode === configurableValue,
  isValidConfig: (data, config) =>
    !!(data.skippable && config.skip) ||
    ((data.contLocation !== configurableValue || config.contLocation !== undefined) &&
      (data.orderMode !== configurableValue || config.orderMode !== undefined)),
  generateSteps: async ctx => {
    const {
      packageName,
      data,
      config,
      state,
      log,
      getMaterialGroup,
      getMaterialGroupPlanet,
      emitStep,
    } = ctx;

    if (data.skippable && config.skip) {
      return;
    }
    const assert: AssertFn = ctx.assert;

    const ignoreStock = data.ignoreStock ?? false;
    const fallbackToCX = data.fallbackToCX ?? false;
    const useInv = data.useInv ?? false;
    const daysToFulfill = data.daysToFulfill ?? 3;
    const currency = data.currency ?? 'AIC';

    const orderMode = data.orderMode ?? 'full';
    assert(orderMode !== configurableValue, 'Invalid order mode.');

    const materials = await getMaterialGroup(data.group);
    assert(materials, 'Invalid material group');
    const traded = Object.values(materials).filter(x => x.quantity > 0);
    assert(traded.length > 0, 'Material group has no materials to trade');

    const exchangeUrl = data.exchangeUrl ?? '';
    assert(exchangeUrl, 'Invalid Exchange URL');

    const location = normalizeLocationName(
      resolveLocation(data.contLocation, config?.contLocation, getMaterialGroupPlanet) ?? '',
    );
    assert(location, 'Invalid location');
    const locationIsCX = contLocationIsCX(location);

    const cx = locationIsCX ? cxCodeContLocationMap[location] : undefined;

    let exchange: PrivateExchange | undefined;

    try {
      const response = await fetch(exchangeUrl);
      const csv = await response.text();
      exchange = pxFromCSV(csv);
    } catch (e) {
      console.error(e);
    }
    assert(exchange, 'Missing or malformed exchange');

    // Take out materials in inventory if requested
    if (useInv && location) {
      const stores = [state.WAR[location], state.BS[location]];

      for (const mat of Object.keys(materials)) {
        for (const store of stores) {
          if (store === undefined) {
            continue;
          }
          const quantity = store[mat];
          if (quantity == null) {
            continue;
          }

          const used = Math.min(materials[mat].quantity, quantity);

          materials[mat].quantity -= used;
          store[mat] -= used;

          if (store[mat] <= 0) {
            delete store[mat];
          }
          if (materials[mat].quantity <= 0) {
            break;
          }
        }

        if (materials[mat].quantity <= 0) {
          delete materials[mat];
        }
      }
    }

    const noBuy = new Set(userData.settings.noBuy);
    const pxTrades: Map<
      // Username
      string,
      Map<
        // Ticker
        string,
        {
          quantity: number;
          price: number;
        }
      >
    > = new Map();
    for (const ticker of Object.keys(materials)) {
      if (noBuy.has(ticker)) {
        continue;
      }
      const { quantity: amount, price } = materials[ticker];
      const priceLimit = price ?? data.priceLimits?.[ticker] ?? Infinity;
      if (isNaN(priceLimit)) {
        log.error('Non-numerical price limit on ' + ticker);
        continue;
      }

      const filled = fillFromPxCx({
        exchange,
        location,
        ignoreStock,
        cx: fallbackToCX && cx ? cx : undefined,
        ticker,
        amount,
        priceLimit,
      });
      if (filled) {
        if (filled.amount < amount && orderMode === 'full') {
          log.warning(
            `Skipping ${ticker} due to insufficient stock: ${fixed0(filled.amount)} available of ${fixed0(amount)} requested.`,
          );
          continue;
        }
        if (fallbackToCX && cx) {
          const cxTrades = filled.trades.filter(x => x.cx);

          let cxQuantity = sumBy(cxTrades, x => x.quantity);
          if (filled.amount < amount && orderMode === 'partial') {
            cxQuantity += amount - filled.amount;
          }
          if (cxQuantity > 0) {
            emitStep(
              CXPO_BUY({
                exchange: cx,
                ticker,
                amount: cxQuantity,
                priceLimit: priceLimit,
                allowUnfilled: orderMode !== 'partial',
              }),
            );
          }
        }
        for (const { cx, username, quantity, price } of filled.trades) {
          if (cx || !username) {
            continue;
          }
          const userTrades =
            pxTrades.get(username) ?? pxTrades.set(username, new Map()).get(username)!;
          const materialTrade = userTrades.get(ticker);
          if (!materialTrade) {
            userTrades.set(ticker, {
              quantity,
              price,
            });
          } else {
            materialTrade.price =
              (materialTrade.quantity * materialTrade.price + quantity * price) /
              (materialTrade.quantity + quantity);
            materialTrade.quantity += quantity;
          }
        }
      } else {
        log.error(`Failed to fill ${ticker}`);
      }
    }
    for (const [user, trades] of [...pxTrades.entries()]) {
      emitStep(
        CONT_TRADE({
          packageName: `${packageName} - ${user}`,
          materials: Object.fromEntries(trades),
          tradeType: 'BUYING',
          location,
          currency,
          daysToFulfill,
        }),
      );
    }
  },
});
