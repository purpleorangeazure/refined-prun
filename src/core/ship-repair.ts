// All numbers derived from "PrUn Ship Repair Calc" Sheet by RNGZero.
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';

const RecommendedRepairThreshold = 0.8;

const ShieldFactors = {
  HEAT_SHIELD_BASIC: 0.05,
  HEAT_SHIELD_ADVANCED: 0.15,
  WHIPPLE_SHIELD_BASIC: 0.05,
  WHIPPLE_SHIELD_ADVANCED: 0.15,
  RADIATION_SHIELD_BASIC: 0.05,
  RADIATION_SHIELD_ADVANCED: 0.1,
  RADIATION_SHIELD_SPECIALIZED: 0.15,
};

const DroneRepairAmount = {
  REPAIR_DRONES_SMALL: 2,
  REPAIR_DRONES_LARGE: 4,
};

const UniversalDamageFactor = 0.75;
const ShieldingDamageFactor = 0.662;

export function calculateRepairCosts(
  blueprint: PrunApi.Blueprint,
  damage: number,
  threshold: number = RecommendedRepairThreshold,
): PrunApi.MaterialAmount[] {
  const damageOfThreshold = Math.max(0, Math.min(damage / (1 - threshold), 1));
  const plating = blueprint.selections.find(x => x.type === 'HULL_TYPE')!;
  const structure = blueprint.selections.find(x => x.type === 'STRUCTURE')!;
  const shielding = {
    heat: blueprint.selections.find(x => x.type === 'HEAT_SHIELD')!,
    whipple: blueprint.selections.find(x => x.type === 'WHIPPLE_SHIELD')!,
    radiation: blueprint.selections.find(x => x.type === 'RADIATION_SHIELD')!,
  };
  const drones = blueprint.selections.find(x => x.type === 'REPAIR_DRONES')!;
  const shieldingFactor =
    1 -
    (ShieldFactors[shielding.heat.option] ?? 0) +
    (ShieldFactors[shielding.whipple.option] ?? 0) +
    (ShieldFactors[shielding.radiation.option] ?? 0);

  const plateCost = {
    material: materialsStore.getById(plating.optionMaterialId),
    amount: plating.amount * damage * UniversalDamageFactor * shieldingFactor,
  };

  const structureCost = {
    material: materialsStore.getById(structure.optionMaterialId),
    amount: structure.amount * damage * UniversalDamageFactor * shieldingFactor,
  };

  const shieldingCosts = Object.values(shielding).map(x => ({
    material: materialsStore.getById(x.optionMaterialId),
    amount: x.amount * damage * UniversalDamageFactor * ShieldingDamageFactor,
  }));

  const droneCost = {
    material: materialsStore.getByTicker('DRF'),
    amount: DroneRepairAmount[drones.option] ?? 0,
  };

  return [
    {
      material: materialsStore.getByTicker('MFK'),
      amount: 12 * damageOfThreshold,
    },
    {
      material: materialsStore.getByTicker('FLP'),
      amount: 8 * damageOfThreshold,
    },
    plateCost,
    structureCost,
    ...shieldingCosts,
    droneCost,
  ].filter(x => x.material !== undefined && x.amount > 0) as PrunApi.MaterialAmount[];
}
