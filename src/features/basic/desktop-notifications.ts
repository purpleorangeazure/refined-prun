import { listenForPrunMessage, Message } from '@src/infrastructure/prun-api/prun-api-listener';
import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { getParameterShips } from '@src/features/XIT/REP/entries';
import { lookupLocalization } from '@src/infrastructure/prun-ui/i18n';

async function processAlert(message: Message) {
  const data = Object.fromEntries(message.payload.data.map(entry => [entry.key, entry.value]));
  const alertType = message.payload.type as keyof typeof L.AlertType;
  const alertTitle = lookupLocalization(L.AlertType, alertType)() ?? alertType;
  const alertBodyLocalization = lookupLocalization(L.Alert, alertType);
  let alertBody: string | undefined;
  switch (alertType) {
    case 'ADMIN_CENTER_RUN_SUCCEEDED':
    case 'ADMIN_CENTER_GOVERNOR_ELECTED':
    case 'ADMIN_CENTER_NO_GOVERNOR_ELECTED':
    case 'ADMIN_CENTER_ELECTION_STARTED':
    case 'ADMIN_CENTER_ELECTION_REMINDER':
    case 'COGC_UPKEEP_STARTED':
    case 'COGC_STATUS_CHANGED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        planetName: getEntityNaturalIdFromAddress(data.planet.address) ?? 'Unknown',
      });
      break;
    case 'ADMIN_CENTER_MOTION_PASSED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        motionName:
          null !== data.motionName && data.motionName.length > 0 ? data.motionName : data.motionId,
        address: getEntityNaturalIdFromAddress(data.planet.address) ?? 'Unknown',
      });
      break;
    case 'ADMIN_CENTER_MOTION_ENDED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        motionId: data.motionId,
        motionName:
          null !== data.motionName && data.motionName.length > 0 ? data.motionName : data.motionId,
        motionStatus: data.motionStatus,
      });
      break;
    case 'ADMIN_CENTER_MOTION_VOTING_STARTED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        motionId: data.motionId,
        motionName:
          null !== data.motionName && data.motionName.length > 0 ? data.motionName : data.motionId,
      });
      break;
    case 'COGC_PROGRAM_CHANGED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        planetName: getEntityNaturalIdFromAddress(data.planet.address) ?? 'Unknown',
        programName: lookupLocalization(L.CoGCProgram, data.program)() ?? data.program,
      });
      break;
    case 'COMEX_TRADE':
    case 'COMEX_ORDER_FILLED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        exchangeName: data.exchange.name,
        commodity: lookupLocalization(L.Material, data.commodity)?.name() ?? data.commodity,
        trades: data.trades ?? 1,
      });
      break;
    case 'COMEX_PICKUP_CONTRACT_CREATED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        exchangeName: data.exchange.name,
        commodity: lookupLocalization(L.Material, data.commodity)?.name() ?? data.commodity,
      });
      break;
    case 'CONTRACT_CONTRACT_CANCELLED':
    case 'CONTRACT_CONTRACT_BREACHED':
    case 'CONTRACT_DEADLINE_EXCEEDED_WITH_CONTROL':
    case 'CONTRACT_DEADLINE_EXCEEDED_WITHOUT_CONTROL':
    case 'CONTRACT_CONTRACT_EXTENDED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        partner: data.partner,
      });
      break;
    case 'CONTRACT_CONDITION_FULFILLED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        partner: data.partner,
        contract: data.naturalId,
        conditionType: data.condition,
      });
      break;
    case 'CONTRACT_CONTRACT_CLOSED':
    case 'CONTRACT_CONTRACT_RECEIVED':
    case 'CONTRACT_CONTRACT_REJECTED':
    case 'CONTRACT_CONTRACT_TERMINATION_REQUESTED':
    case 'CONTRACT_CONTRACT_TERMINATED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        contract: ''.concat(data.contract),
        partner: data.partner,
      });
      break;
    case 'CONTRACT_CONDITION_PICKUP_CONDITION_PENDING':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        contract: ''.concat(data.contract),
      });
      break;
    case 'CORPORATION_MANAGER_INVITE_ACCEPTED':
    case 'CORPORATION_MANAGER_INVITE_REJECTED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        corporationName: data.corporation.name,
        inviteeName: data.invitee.name,
      });
      break;
    case 'CORPORATION_SHAREHOLDER_DIVIDEND_RECEIVED':
    case 'CORPORATION_SHAREHOLDER_INVITE_RECEIVED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        corporationName: data.corporation.name,
      });
      break;
    case 'CORPORATION_MANAGER_SHAREHOLDER_LEFT':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        companyName: data.company.name,
        corporationName: data.corporation.name,
      });
      break;
    case 'CORPORATION_PROJECT_FINISHED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        type:
          (lookupLocalization(L.CorporationProject, data.type) as LiteralLocalizationLeaf)() ??
          data.type,
      });
      break;
    case 'INFRASTRUCTURE_OPERATIONAL_STATE_CHANGED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        type: lookupLocalization(L.InfrastructureType, data.type)() ?? data.type,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        state: lookupLocalization(L.InfrastructureOperationalState, data.state)() ?? data.state,
      });
      break;
    case 'INFRASTRUCTURE_PROJECT_COMPLETED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        type: lookupLocalization(L.InfrastructureType, data.type)() ?? data.type,
      });
      break;
    case 'INFRASTRUCTURE_UPGRADE_COMPLETED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        type: lookupLocalization(L.InfrastructureType, data.type)() ?? data.type,
        // Not sure about this one, defaulting to raw value.
        infrastructure: data.infrastructure,
      });
      break;
    case 'INFRASTRUCTURE_UPKEEP_PHASE_STARTED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        type: lookupLocalization(L.InfrastructureType, data.type)() ?? data.type,
        // Not sure about this one, defaulting to raw value.
        infrastructure: data.infrastructure,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        naturalId: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'FOREX_TRADE':
    case 'FOREX_ORDER_FILLED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        pair: ''.concat(data.pair.base.code, '/').concat(data.pair.quote.code),
        trades: data.trades ?? 1,
      });
      break;
    case 'GATEWAY_LINK_REQUEST_RECEIVED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        destinationGateway: data.destinationGateway.name,
        originGateway: data.originGateway.name,
        // Not sure about this one, defaulting to raw value.
        originAddress: data.originGatewayAddress.address,
      });
      break;
    case 'GATEWAY_LINK_ESTABLISHED':
    case 'GATEWAY_LINK_UNLINKED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        // Not sure about this one, defaulting to raw value
        gateway: data.gateway.id,
        // Not sure about this one, defaulting to raw value
        otherGateway: data.otherGateway.id,
      });
      break;
    case 'GATEWAY_JUMP_ABORTED_MISSING_FUNDS':
    case 'GATEWAY_JUMP_ABORTED_NOT_OPERATIONAL':
    case 'GATEWAY_JUMP_ABORTED_NO_FUEL':
    case 'GATEWAY_JUMP_ABORTED_LINK_NOT_ESTABLISHED':
    case 'GATEWAY_JUMP_ABORTED_LINK_CHANGED':
    case 'GATEWAY_JUMP_ABORTED_NO_CAPACITY':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        ship: (getParameterShips([data.shipId]) ?? [])[0]?.name ?? 'Unknown',
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'LOCAL_MARKET_AD_ACCEPTED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        addressName: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        partner: ''.concat(data.partner.name),
      });
      break;
    case 'LOCAL_MARKET_AD_EXPIRED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        addressName: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'PLANETARY_PROJECT_FINISHED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        // Not sure about this one, defaulting to raw value
        project: data.project,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'POPULATION_PROJECT_UPGRADED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        level: data.level,
        type: lookupLocalization(L.Reactor, data.type)() ?? data.type,
      });
      break;
    case 'POPULATION_REPORT_AVAILABLE':
    case 'SHIPYARD_PROJECT_FINISHED':
    case 'WAREHOUSE_STORE_LOCKED_INSUFFICIENT_FUNDS':
    case 'WAREHOUSE_STORE_UNLOCKED':
    case 'WORKFORCE_UNSATISFIED':
    case 'WORKFORCE_OUT_OF_SUPPLIES':
    case 'WORKFORCE_LOW_SUPPLIES':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'PRODUCTION_ORDER_FINISHED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        quantity: data.quantity,
        material: lookupLocalization(L.Material, data.material)?.name() ?? data.material,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'RELEASE_NOTES':
      break;
    case 'SHIP_FLIGHT_ENDED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        destination: getEntityNaturalIdFromAddress(data.destination.address) ?? 'Unknown',
        registration: (getParameterShips([data.shipId]) ?? [])[0]?.name ?? 'Unknown',
      });
      break;
    case 'SITE_EXPERT_DROPPED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])({
        category:
          lookupLocalization(L.ExpertiseCategory, data.expertiseCategory)() ??
          data.expertiseCategory,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      });
      break;
    case 'TUTORIAL_TASK_FINISHED':
      alertBody = (alertBodyLocalization as (typeof L.Alert)[typeof alertType])();
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
  const notificationPermission = await Notification.requestPermission();
  if (notificationPermission === 'granted') {
    new Notification(alertTitle, {
      body: alertBody,
      icon: 'https://press.simulogics.games/prosperousuniverse/logos/prun-logo-transparent.png',
    });
  }
}

function init() {
  listenForPrunMessage(processAlert, 'ALERTS_ALERT');
}

features.add(import.meta.url, init, 'Forwards in-game notifications to the desktop.');
