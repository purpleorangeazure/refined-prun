import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { getParameterShips } from '@src/features/XIT/REP/entries';
import { lookupLocalization } from '@src/infrastructure/prun-ui/i18n';
import { alertsStore } from '@src/infrastructure/prun-api/data/alerts';

// Definitely needs work:
// Contract Condition Fulfilled
// Ship Arrived
// Population infrastructure upgraded

const alertQueue = new Map<
  string,
  { title: string; body: string | undefined; push: NodeJS.Timeout }
>();

async function processAlert(alert: PrunApi.Alert) {
  if (document.hasFocus()) {
    console.log('Ignoring alert because the window is already focused.');
    // Return;
  }
  const data = alert.data;
  const alertId = alert.id;
  const alertType = alert.type;
  const title = lookupLocalization(L.AlertType, alertType)() ?? alertType;
  const alertBodyLocalization = lookupLocalization(L.Alert, alertType);
  let body: string | undefined;
  console.log(`processing alert ${alertId}: ${alertType}`, data);
  switch (alertType) {
    case 'ADMIN_CENTER_RUN_SUCCEEDED':
    case 'ADMIN_CENTER_GOVERNOR_ELECTED':
    case 'ADMIN_CENTER_NO_GOVERNOR_ELECTED':
    case 'ADMIN_CENTER_ELECTION_STARTED':
    case 'ADMIN_CENTER_ELECTION_REMINDER':
    case 'COGC_UPKEEP_STARTED':
    case 'COGC_STATUS_CHANGED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        planetName:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'planet')?.address) ?? 'Unknown',
      });
      break;
    case 'ADMIN_CENTER_MOTION_PASSED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        motionName: getAlertValue(data, 'motionName') ?? getAlertValue(data, 'motionId')!,
        address: getEntityNaturalIdFromAddress(getAlertValue(data, 'planet')?.address) ?? 'Unknown',
      });
      break;
    case 'ADMIN_CENTER_MOTION_ENDED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        motionId: getAlertValue(data, 'motionId')!,
        motionName: getAlertValue(data, 'motionName') ?? getAlertValue(data, 'motionId')!,
        motionStatus: getAlertValue(data, 'motionStatus')!,
      });
      break;
    case 'ADMIN_CENTER_MOTION_VOTING_STARTED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        motionId: getAlertValue(data, 'motionId')!,
        motionName: getAlertValue(data, 'motionName') ?? getAlertValue(data, 'motionId')!,
      });
      break;
    case 'COGC_PROGRAM_CHANGED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        planetName:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'planet')?.address) ?? 'Unknown',
        programName:
          lookupLocalization(L.CoGCProgram, getAlertValue(data, 'program')!)() ??
          getAlertValue(data, 'program')!,
      });
      break;
    case 'COMEX_TRADE':
    case 'COMEX_ORDER_FILLED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        exchangeName: getAlertValue(data, 'exchange')!.name,
        commodity:
          lookupLocalization(L.Material, getAlertValue(data, 'commodity')!)?.name() ??
          getAlertValue(data, 'commodity')!,
        trades: (getAlertValue(data, 'trades') ?? 1).toString(),
      });
      break;
    case 'COMEX_PICKUP_CONTRACT_CREATED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        exchangeName: getAlertValue(data, 'exchange')!.name,
        commodity:
          lookupLocalization(L.Material, getAlertValue(data, 'commodity')!)?.name() ??
          getAlertValue(data, 'commodity')!,
      });
      break;
    case 'CONTRACT_CONTRACT_CANCELLED':
    case 'CONTRACT_CONTRACT_BREACHED':
    case 'CONTRACT_DEADLINE_EXCEEDED_WITH_CONTROL':
    case 'CONTRACT_DEADLINE_EXCEEDED_WITHOUT_CONTROL':
    case 'CONTRACT_CONTRACT_EXTENDED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        partner: getAlertValue(data, 'partner')!.name,
      });
      break;
    case 'CONTRACT_CONDITION_FULFILLED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        partner: getAlertValue(data, 'partner')!.name,
        contract: alert.naturalId,
        conditionType: getAlertValue(data, 'condition')!,
      });
      break;
    case 'CONTRACT_CONTRACT_CLOSED':
    case 'CONTRACT_CONTRACT_RECEIVED':
    case 'CONTRACT_CONTRACT_REJECTED':
    case 'CONTRACT_CONTRACT_TERMINATION_REQUESTED':
    case 'CONTRACT_CONTRACT_TERMINATED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        contract: getAlertValue(data, 'contract')!,
        partner: getAlertValue(data, 'partner')!.name,
      });
      break;
    case 'CONTRACT_CONDITION_PICKUP_CONDITION_PENDING':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        contract: getAlertValue(data, 'contract')!,
      });
      break;
    case 'CORPORATION_MANAGER_INVITE_ACCEPTED':
    case 'CORPORATION_MANAGER_INVITE_REJECTED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        corporationName: getAlertValue(data, 'corporation')!.name,
        inviteeName: getAlertValue(data, 'invitee')!.name,
      });
      break;
    case 'CORPORATION_SHAREHOLDER_DIVIDEND_RECEIVED':
    case 'CORPORATION_SHAREHOLDER_INVITE_RECEIVED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        corporationName: getAlertValue(data, 'corporation')!.name,
      });
      break;
    case 'CORPORATION_MANAGER_SHAREHOLDER_LEFT':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        companyName: getAlertValue(data, 'company')!.name,
        corporationName: getAlertValue(data, 'corporation')!.name,
      });
      break;
    case 'CORPORATION_PROJECT_FINISHED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
        type:
          (
            lookupLocalization(
              L.CorporationProject,
              getAlertValue(data, 'type')!,
            ) as LiteralLocalizationLeaf
          )() ?? getAlertValue(data, 'type')!,
      });
      break;
    case 'INFRASTRUCTURE_OPERATIONAL_STATE_CHANGED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        type:
          lookupLocalization(L.InfrastructureType, getAlertValue(data, 'type')!)() ??
          getAlertValue(data, 'type')!,
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
        state:
          lookupLocalization(L.InfrastructureOperationalState, getAlertValue(data, 'state')!)() ??
          getAlertValue(data, 'state')!,
      });
      break;
    case 'INFRASTRUCTURE_PROJECT_COMPLETED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
        type:
          lookupLocalization(L.InfrastructureType, getAlertValue(data, 'type')!)() ??
          getAlertValue(data, 'type')!,
      });
      break;
    case 'INFRASTRUCTURE_UPGRADE_COMPLETED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        type:
          lookupLocalization(L.InfrastructureType, getAlertValue(data, 'type')!)() ??
          getAlertValue(data, 'type')!,
        // Not sure about this one, defaulting to raw value.
        infrastructure: getAlertValue(data, 'infrastructure')!,
      });
      break;
    case 'INFRASTRUCTURE_UPKEEP_PHASE_STARTED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        type:
          lookupLocalization(L.InfrastructureType, getAlertValue(data, 'type')!)() ??
          getAlertValue(data, 'type')!,
        // Not sure about this one, defaulting to raw value.
        infrastructure: getAlertValue(data, 'infrastructure')!,
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
        naturalId:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'FOREX_TRADE':
    case 'FOREX_ORDER_FILLED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        pair: ''
          .concat(getAlertValue(data, 'pair')!.base.code, '/')
          .concat(getAlertValue(data, 'pair')!.quote.code),
        trades: (getAlertValue(data, 'trades') ?? 1).toString(),
      });
      break;
    case 'GATEWAY_LINK_REQUEST_RECEIVED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        destinationGateway: getAlertValue(data, 'destinationGateway')!.name,
        originGateway: getAlertValue(data, 'originGateway')!.name,
        // Not sure about this one, defaulting to raw value.
        originAddress:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'originGatewayAddress')!.address) ??
          'Unknown',
      });
      break;
    case 'GATEWAY_LINK_ESTABLISHED':
    case 'GATEWAY_LINK_UNLINKED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        // Not sure about this one, defaulting to raw value
        gateway: getAlertValue(data, 'gateway')!.id,
        // Not sure about this one, defaulting to raw value
        otherGateway: getAlertValue(data, 'otherGateway')!.id,
      });
      break;
    case 'GATEWAY_JUMP_ABORTED_MISSING_FUNDS':
    case 'GATEWAY_JUMP_ABORTED_NOT_OPERATIONAL':
    case 'GATEWAY_JUMP_ABORTED_NO_FUEL':
    case 'GATEWAY_JUMP_ABORTED_LINK_NOT_ESTABLISHED':
    case 'GATEWAY_JUMP_ABORTED_LINK_CHANGED':
    case 'GATEWAY_JUMP_ABORTED_NO_CAPACITY':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        ship: (getParameterShips([getAlertValue(data, 'shipId')!]) ?? [])[0]?.name ?? 'Unknown',
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'LOCAL_MARKET_AD_ACCEPTED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        addressName:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
        partner: ''.concat(getAlertValue(data, 'partner')!.name),
      });
      break;
    case 'LOCAL_MARKET_AD_EXPIRED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        addressName:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'PLANETARY_PROJECT_FINISHED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        // Not sure about this one, defaulting to raw value
        project: getAlertValue(data, 'project')!,
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'POPULATION_PROJECT_UPGRADED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
        level: getAlertValue(data, 'level')!.toString(),
        type:
          lookupLocalization(L.Reactor, getAlertValue(data, 'type')!)() ??
          getAlertValue(data, 'type')!,
      });
      break;
    case 'POPULATION_REPORT_AVAILABLE':
    case 'SHIPYARD_PROJECT_FINISHED':
    case 'WAREHOUSE_STORE_LOCKED_INSUFFICIENT_FUNDS':
    case 'WAREHOUSE_STORE_UNLOCKED':
    case 'WORKFORCE_UNSATISFIED':
    case 'WORKFORCE_OUT_OF_SUPPLIES':
    case 'WORKFORCE_LOW_SUPPLIES':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'PRODUCTION_ORDER_FINISHED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        quantity: getAlertValue(data, 'quantity')!.toString(),
        material:
          lookupLocalization(L.Material, getAlertValue(data, 'material')!)?.name() ??
          getAlertValue(data, 'material')!,
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'RELEASE_NOTES':
      break;
    case 'SHIP_FLIGHT_ENDED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        destination:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'destination')!.address) ?? 'Unknown',
        registration:
          (getParameterShips([getAlertValue(data, 'shipId')!]) ?? [])[0]?.name ?? 'Unknown',
      });
      break;
    case 'SITE_EXPERT_DROPPED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        category:
          lookupLocalization(L.ExpertiseCategory, getAlertValue(data, 'expertiseCategory')!)() ??
          getAlertValue(data, 'expertiseCategory')!,
        address:
          getEntityNaturalIdFromAddress(getAlertValue(data, 'address')!.address) ?? 'Unknown',
      });
      break;
    case 'TUTORIAL_TASK_FINISHED':
      body = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])();
      break;
    case 'USER_CONVERSION_REMINDER_LICENSE':
      break;
    case 'USER_LICENSE_ABOUT_TO_EXPIRE':
      break;
    case 'USER_LICENSE_EXPIRED':
      break;
    case 'USER_STEAM_REVIEW':
      break;
    case 'USER_LICENSE_GIFT_RECEIVED':
      break;
    default:
      console.error(`Unhandled alert type: ${alertType}`, data);
      break;
  }
  const queued = alertQueue.get(alertId);
  if (queued) {
    queued.body = body;
  } else {
    const notificationData = {
      title,
      body,
      push: setTimeout(() => {
        new Notification(notificationData.title, {
          tag: alertId,
          body: notificationData.body,
          icon: 'https://press.simulogics.games/prosperousuniverse/logos/prun-logo-transparent.png',
        });
      }, 500),
    };
    alertQueue.set(alertId, notificationData);
  }
}

async function init() {
  if (!('Notification' in window) || Notification.permission == 'denied') {
    return;
  } else if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }
  }
  watch(
    alertsStore.all,
    (alerts, oldAlerts) => {
      for (const alert of alerts ?? []) {
        if (!oldAlerts?.some(x => x === alert)) {
          processAlert(alert);
        }
      }
    },
    { deep: true },
  );
}

type AlertValue<K extends PrunApi.AlertData['key']> = Extract<
  PrunApi.AlertData,
  { key: K }
>['value'];

function getAlertValue<K extends PrunApi.AlertData['key']>(
  data: PrunApi.AlertData[],
  key: K,
): AlertValue<K> | undefined {
  const item = data.find(x => x.key === key);
  return item?.value as AlertValue<K> | undefined;
}

features.add(import.meta.url, init, 'Forwards in-game notifications to the desktop.');
