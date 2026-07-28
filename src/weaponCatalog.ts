import catalog from "./weaponCatalog.json"
import type { BaseStat } from "./types"

export interface WeaponCatalogStat {
	id: string
	names: string[]
}

export interface WeaponCatalogMark {
	itemId: string
	name: string
	statNames: string[]
}

export interface WeaponFamily {
	id: string
	name: string
	type: "melee" | "ranged"
	itemIds: string[]
	stats: WeaponCatalogStat[]
	marks: WeaponCatalogMark[]
}

export const WEAPON_FAMILIES = catalog.families as WeaponFamily[]
export const WEAPON_FAMILY_IDS = WEAPON_FAMILIES.map(({ id }) => id)
export const WEAPON_FAMILY_LABELS = Object.fromEntries(
	WEAPON_FAMILIES.map(({ id, name, type }) => [
		id,
		`${type === "melee" ? "Melee" : "Ranged"} — ${name}`,
	]),
)

const familiesById = new Map(WEAPON_FAMILIES.map((family) => [family.id, family]))
const familiesByItemId = new Map(
	WEAPON_FAMILIES.flatMap((family) => family.itemIds.map((itemId) => [itemId, family] as const)),
)

export function getWeaponFamily(id: string | undefined) {
	return id ? familiesById.get(id) : undefined
}

export function getWeaponFamilyForItem(itemId: string) {
	return familiesByItemId.get(itemId)
}

export function getWeaponStatLabel(familyId: string, statId: string) {
	return getWeaponFamily(familyId)
		?.stats.find(({ id }) => id === statId)
		?.names.join(" / ")
}

export function matchesWeaponFamilyStats(
	family: WeaponFamily,
	maxStats: BaseStat[],
	requirements: { id: string; min: number }[],
	getStatName: (statId: string) => string,
) {
	return requirements.every((requirement) => {
		const slot = family.stats.find(({ id }) => id === requirement.id)
		if (!slot) return false

		return maxStats.some(
			(stat) =>
				slot.names.includes(getStatName(stat.name)) &&
				Math.round(stat.value * 100) >= requirement.min,
		)
	})
}
