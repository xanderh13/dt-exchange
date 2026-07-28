import type { Trait } from "./types"

export const CURIO_STATS = ["toughness", "health", "stamina", "wound"] as const
export type CurioStat = (typeof CURIO_STATS)[number]

export const CURIO_STAT_LABELS: Record<CurioStat, string> = {
	toughness: "Toughness",
	health: "Health",
	stamina: "Stamina",
	wound: "Wound",
}

export const CURIO_STAT_LIMITS: Record<CurioStat, { min: number; max: number }> = {
	toughness: { min: 13, max: 17 },
	health: { min: 17, max: 21 },
	stamina: { min: 1, max: 3 },
	wound: { min: 1, max: 1 },
}

const CURIO_TRAIT_IDS: Record<CurioStat, string> = {
	toughness: "content/items/traits/gadget_inate_trait/trait_inate_gadget_toughness",
	health: "content/items/traits/gadget_inate_trait/trait_inate_gadget_health",
	stamina: "content/items/traits/gadget_inate_trait/trait_inate_gadget_stamina",
	wound: "content/items/traits/gadget_inate_trait/trait_inate_gadget_health_segment",
}

function lerp(min: number, max: number, value: number) {
	const clampedValue = Math.min(Math.max(value, 0), 1)
	return min * (1 - clampedValue) + max * clampedValue
}

export function getCurioStatValue(stat: CurioStat, trait: Trait) {
	switch (stat) {
		case "toughness":
			return Math.round(lerp(0.05, 0.2, trait.value ?? 0) * 100)
		case "health":
			return Math.round(lerp(0.05, 0.25, trait.value ?? 0) * 100)
		case "stamina": {
			const values = [1, 2, 3]
			const index = Math.round(lerp(1, values.length, trait.value ?? 0)) - 1
			return values[index] ?? 1
		}
		case "wound":
			return 1
	}
}

export function matchesCurioStat(traits: Trait[], stat: CurioStat, minimum: number | undefined) {
	const trait = traits.find(({ id }) => id === CURIO_TRAIT_IDS[stat])
	if (!trait) return false
	if (stat === "wound" || minimum === undefined) return true
	return getCurioStatValue(stat, trait) >= minimum
}
