import { listenForPrunMessage, Message } from '@src/infrastructure/prun-api/prun-api-listener';
import { localization } from '@src/infrastructure/shell/localization';
import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { getParameterShips } from '@src/features/XIT/REP/entries';

async function processAlert(message: Message) {
  const data = Object.fromEntries(message.payload.data.map(entry => [entry.key, entry.value]));
  const alertType = message.payload.type as string;
  const alertTitleMessageFormat = localization.get(`AlertType.${alertType}`);
  const alertBodyMessageFormat = localization.get(`Alert.${alertType}`);
  if (!alertTitleMessageFormat || !alertBodyMessageFormat) {
    console.error(`Localization for alert type ${alertType} not found`);
    return;
  }
  let bodyParameter: Record<string, string> = {};
  switch (alertType) {
    case 'ADMIN_CENTER_RUN_SUCCEEDED':
    case 'ADMIN_CENTER_GOVERNOR_ELECTED':
    case 'ADMIN_CENTER_NO_GOVERNOR_ELECTED':
    case 'ADMIN_CENTER_ELECTION_STARTED':
    case 'ADMIN_CENTER_ELECTION_REMINDER':
    case 'COGC_UPKEEP_STARTED':
    case 'COGC_STATUS_CHANGED':
      bodyParameter = {
        planetName: getEntityNaturalIdFromAddress(data.planet.address) ?? 'Unknown',
      };
      break;
    case 'ADMIN_CENTER_MOTION_PASSED':
      bodyParameter = {
        motionName:
          null !== data.motionName && data.motionName.length > 0 ? data.motionName : data.motionId,
        address: getEntityNaturalIdFromAddress(data.planet.address) ?? 'Unknown',
      };
      break;
    case 'ADMIN_CENTER_MOTION_ENDED':
      bodyParameter = {
        motionId: data.motionId,
        motionName:
          null !== data.motionName && data.motionName.length > 0 ? data.motionName : data.motionId,
        motionStatus: data.motionStatus,
      };
      break;
    case 'ADMIN_CENTER_MOTION_VOTING_STARTED':
      bodyParameter = {
        motionId: data.motionId,
        motionName:
          null !== data.motionName && data.motionName.length > 0 ? data.motionName : data.motionId,
      };
      break;
    case 'COGC_PROGRAM_CHANGED':
      bodyParameter = {
        planetName: getEntityNaturalIdFromAddress(data.planet.address) ?? 'Unknown',
        programName:
          asString(localization.get(`CoGCProgram.${data.program}`)?.format()) ?? data.program,
      };
      break;
    case 'COMEX_TRADE':
    case 'COMEX_ORDER_FILLED':
      bodyParameter = {
        exchangeName: data.exchange.name,
        commodity:
          asString(localization.get(`Material.${data.commodity}.name`)?.format()) ?? data.commodity,
        trades: data.trades ?? 1,
      };
      break;
    case 'COMEX_PICKUP_CONTRACT_CREATED':
      bodyParameter = {
        exchangeName: data.exchange.name,
        commodity:
          asString(localization.get(`Material.${data.commodity}.name`)?.format()) ?? data.commodity,
      };
      break;
    case 'CONTRACT_CONTRACT_CANCELLED':
    case 'CONTRACT_CONTRACT_BREACHED':
    case 'CONTRACT_DEADLINE_EXCEEDED_WITH_CONTROL':
    case 'CONTRACT_DEADLINE_EXCEEDED_WITHOUT_CONTROL':
    case 'CONTRACT_CONTRACT_EXTENDED':
      bodyParameter = {
        partner: data.partner,
      };
      break;
    case 'CONTRACT_CONDITION_FULFILLED':
      bodyParameter = {
        partner: data.partner,
        contract: data.naturalId,
        conditionType: data.condition,
      };
      break;
    case 'CONTRACT_CONTRACT_CLOSED':
    case 'CONTRACT_CONTRACT_RECEIVED':
    case 'CONTRACT_CONTRACT_REJECTED':
    case 'CONTRACT_CONTRACT_TERMINATION_REQUESTED':
    case 'CONTRACT_CONTRACT_TERMINATED':
      bodyParameter = {
        contract: ''.concat(data.contract),
        partner: data.partner,
      };
      break;
    case 'CONTRACT_CONDITION_PICKUP_CONDITION_PENDING':
      bodyParameter = {
        contract: ''.concat(data.contract),
      };
      break;
    case 'CORPORATION_MANAGER_INVITE_ACCEPTED':
    case 'CORPORATION_MANAGER_INVITE_REJECTED':
      bodyParameter = {
        corporationName: data.corporation.name,
        inviteeName: data.invitee.name,
      };
      break;
    case 'CORPORATION_SHAREHOLDER_DIVIDEND_RECEIVED':
    case 'CORPORATION_SHAREHOLDER_INVITE_RECEIVED':
      bodyParameter = { corporationName: data.corporation.name };
      break;
    case 'CORPORATION_MANAGER_SHAREHOLDER_LEFT':
      bodyParameter = {
        companyName: data.company.name,
        corporationName: data.corporation.name,
      };
      break;
    case 'CORPORATION_PROJECT_FINISHED':
      bodyParameter = {
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        type: asString(localization.get(`CorporationProject.${data.type}`)?.format()) ?? data.type,
      };
      break;
    case 'INFRASTRUCTURE_OPERATIONAL_STATE_CHANGED':
      bodyParameter = {
        type: asString(localization.get(`InfrastructureType.${data.type}`)?.format()) ?? data.type,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        state:
          asString(localization.get(`InfrastructureOperationalState.${data.state}`)?.format()) ??
          data.state,
      };
      break;
    case 'INFRASTRUCTURE_PROJECT_COMPLETED':
      bodyParameter = {
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        type: asString(localization.get(`InfrastructureType.${data.type}`)?.format()) ?? data.type,
      };
      break;
    case 'INFRASTRUCTURE_UPGRADE_COMPLETED':
      bodyParameter = {
        type: asString(localization.get(`InfrastructureType.${data.type}`)?.format()) ?? data.type,
        // Not sure about this one, defaulting to raw value.
        infrastructure: data.infrastructure,
      };
      break;
    case 'INFRASTRUCTURE_UPKEEP_PHASE_STARTED':
      bodyParameter = {
        type: asString(localization.get(`InfrastructureType.${data.type}`)?.format()) ?? data.type,
        // Not sure about this one, defaulting to raw value.
        infrastructure: data.infrastructure,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        naturalId: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      };
      break;
    case 'FOREX_TRADE':
    case 'FOREX_ORDER_FILLED':
      bodyParameter = {
        pair: ''.concat(data.pair.base.code, '/').concat(data.pair.quote.code),
        trades: data.trades ?? 1,
      };
      break;
    case 'GATEWAY_LINK_REQUEST_RECEIVED':
      bodyParameter = {
        destinationGateway: data.destinationGateway.name,
        originGateway: data.originGateway.name,
        // Not sure about this one, defaulting to raw value.
        originAddress: data.originGatewayAddress.address,
      };
      break;
    case 'GATEWAY_LINK_ESTABLISHED':
    case 'GATEWAY_LINK_UNLINKED':
      bodyParameter = {
        // Not sure about this one, defaulting to raw value
        gateway: data.gateway.id,
        // Not sure about this one, defaulting to raw value
        otherGateway: data.otherGateway.id,
      };
      break;
    case 'GATEWAY_JUMP_ABORTED_MISSING_FUNDS':
    case 'GATEWAY_JUMP_ABORTED_NOT_OPERATIONAL':
    case 'GATEWAY_JUMP_ABORTED_NO_FUEL':
    case 'GATEWAY_JUMP_ABORTED_LINK_NOT_ESTABLISHED':
    case 'GATEWAY_JUMP_ABORTED_LINK_CHANGED':
    case 'GATEWAY_JUMP_ABORTED_NO_CAPACITY':
      bodyParameter = {
        ship: (getParameterShips([data.shipId]) ?? [])[0]?.name ?? 'Unknown',
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      };
      break;
    case 'LOCAL_MARKET_AD_ACCEPTED':
      bodyParameter = {
        addressName: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        partner: ''.concat(data.partner.name),
      };
      break;
    case 'LOCAL_MARKET_AD_EXPIRED':
      bodyParameter = {
        addressName: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      };
      break;
    case 'PLANETARY_PROJECT_FINISHED':
      bodyParameter = {
        // Not sure about this one, defaulting to raw value
        project: data.project,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      };
      break;
    case 'POPULATION_PROJECT_UPGRADED':
      bodyParameter = {
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
        level: data.level,
        type: asString(localization.get(`Reactor.${data.type}`)?.format()) ?? data.type,
      };
      break;
    case 'POPULATION_REPORT_AVAILABLE':
    case 'SHIPYARD_PROJECT_FINISHED':
    case 'WAREHOUSE_STORE_LOCKED_INSUFFICIENT_FUNDS':
    case 'WAREHOUSE_STORE_UNLOCKED':
    case 'WORKFORCE_UNSATISFIED':
    case 'WORKFORCE_OUT_OF_SUPPLIES':
    case 'WORKFORCE_LOW_SUPPLIES':
      bodyParameter = { address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown' };
      break;
    case 'PRODUCTION_ORDER_FINISHED':
      bodyParameter = {
        quantity: data.quantity,
        material:
          asString(localization.get(`Material.${data.commodity}.name`)?.format()) ?? data.material,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      };
      break;
    case 'SHIP_FLIGHT_ENDED':
      bodyParameter = {
        destination: getEntityNaturalIdFromAddress(data.destination.address) ?? 'Unknown',
        registration: (getParameterShips([data.shipId]) ?? [])[0]?.name ?? 'Unknown',
      };
      break;
    case 'SITE_EXPERT_DROPPED':
      bodyParameter = {
        category:
          asString(localization.get(`ExpertiseCategory.{data.expertiseCategory}`)?.format()) ??
          data.expertiseCategory,
        address: getEntityNaturalIdFromAddress(data.address.address) ?? 'Unknown',
      };
      break;
    case 'TUTORIAL_TASK_FINISHED':
      bodyParameter = {};
      break;
    case 'USER_LICENSE_GIFT_RECEIVED':
    default:
      bodyParameter = data;
      break;
  }
  const alertTitle = asString(alertTitleMessageFormat.format()) ?? alertType;
  const alertBody = asString(alertBodyMessageFormat.format(bodyParameter)) ?? alertType;
  const notificationPermission = await Notification.requestPermission();
  if (notificationPermission === 'granted') {
    new Notification(alertTitle, {
      body: alertBody,
      icon: 'https://press.simulogics.games/prosperousuniverse/logos/prun-logo-transparent.png',
    });
  }
}

function asString(value: string | (string | undefined)[] | undefined): string | undefined {
  if (value == undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value.join(' ') : value;
}

function init() {
  listenForPrunMessage(processAlert, 'ALERTS_ALERT');
}

features.add(import.meta.url, init, 'Forwards in-game notifications to the desktop.');
