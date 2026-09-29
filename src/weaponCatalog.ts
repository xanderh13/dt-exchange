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
	blessings: WeaponCatalogBlessing[]
}

export interface WeaponCatalogBlessing {
	name: string
	effect: string
	traitSuffixes: string[]
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
export const WEAPON_FAMILY_IDS = [...WEAPON_FAMILIES]
	.sort(
		(a, b) =>
			(a.type === "melee" ? 0 : 1) - (b.type === "melee" ? 0 : 1) || a.name.localeCompare(b.name),
	)
	.map(({ id }) => id)
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
const marksByItemId = new Map(
	WEAPON_FAMILIES.flatMap((family) => family.marks.map((mark) => [mark.itemId, mark] as const)),
)

export function getWeaponFamily(id: string | undefined) {
	return id ? familiesById.get(id) : undefined
}

export function getWeaponFamilyForItem(itemId: string) {
	return familiesByItemId.get(itemId)
}

export function getWeaponBlessing(itemId: string, traitId: string) {
	const traitSuffix = traitId.split("/").at(-1)
	if (!traitSuffix) return undefined
	return marksByItemId
		.get(itemId)
		?.blessings.find(({ traitSuffixes }) => traitSuffixes.includes(traitSuffix))
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
