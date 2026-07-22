import type { Description } from "../../types"

const POWER_STEP = 10
const WEAPON_POWER_OFFSET = 80
const WEAPON_STATS_PER_POWER_STEP = 6
const MAX_GADGET_BASE_LEVEL = 92
const MAX_WEAPON_BASE_LEVEL = 300

/**
 * Reproduce the power number displayed by Darktide's item UI.
 *
 * The backend's itemLevel/baseItemLevel values are internal rating budgets,
 * not the stepped Power value shown in game.
 */
export function calculateItemPower(description: Description): number {
	const overrides = description.overrides

	if (description.type === "gadget") {
		const normalizedLevel = overrides.baseItemLevel / MAX_GADGET_BASE_LEVEL
		return (
			Math.floor(
				(normalizedLevel * MAX_WEAPON_BASE_LEVEL) / WEAPON_STATS_PER_POWER_STEP,
			) * POWER_STEP
		)
	}

	const totalStats = Math.floor(
		(overrides.base_stats ?? []).reduce((total, stat) => total + stat.value, 0) * 100 + 0.5,
	)

	return (
		Math.max(
			0,
			Math.floor((totalStats - WEAPON_POWER_OFFSET) / WEAPON_STATS_PER_POWER_STEP),
		) * POWER_STEP
	)
}
