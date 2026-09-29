import { describe, expect, test } from "vitest"
import type { BaseStat } from "./types"
import {
	getWeaponFamily,
	getWeaponFamilyForItem,
	getWeaponBlessing,
	matchesWeaponFamilyStats,
	WEAPON_FAMILIES,
	WEAPON_FAMILY_IDS,
} from "./weaponCatalog"

describe("weapon catalog", () => {
	test("contains one five-slot layout for every family and covers every mark", () => {
		const familyIds = new Set<string>()
		const itemIds = new Set<string>()

		for (const family of WEAPON_FAMILIES) {
			expect(familyIds.has(family.id)).toBe(false)
			familyIds.add(family.id)
			expect(family.stats).toHaveLength(5)

			for (const mark of family.marks) {
				expect(itemIds.has(mark.itemId)).toBe(false)
				itemIds.add(mark.itemId)
				expect(family.itemIds).toContain(mark.itemId)
				expect(getWeaponFamilyForItem(mark.itemId)?.id).toBe(family.id)

				for (const slot of family.stats) {
					expect(mark.statNames.filter((name) => slot.names.includes(name))).toHaveLength(1)
				}

				const blessingSuffixes = mark.blessings.flatMap(({ traitSuffixes }) => traitSuffixes)
				expect(new Set(blessingSuffixes).size).toBe(blessingSuffixes.length)
			}
		}
	})

	test("maps new-family Atoma trait IDs to current Games Lantern blessings", () => {
		expect(
			getWeaponBlessing(
				"content/items/weapons/player/ranged/shotgun_p3_m1",
				"content/items/traits/bespoke_shotgun_p3/bleed_on_crit",
			),
		).toMatchObject({
			name: "Flechette",
			effect: "6 Bleed Stacks on Critical Hit.",
		})
	})

	test("combines the Duelling Sword swapped modifier into one localized slot", () => {
		const family = getWeaponFamily("combatsword_p3")

		expect(family?.name).toBe("Duelling Sword")
		expect(family?.stats[0]?.names).toEqual(["Cleave Damage", "Defences"])
		expect(family?.marks.map(({ name }) => name)).toEqual([
			"Maccabian Mk IV Duelling Sword",
			"Maccabian Mk II Duelling Sword",
			"Maccabian Mk V Duelling Sword",
		])
	})

	test("lists all melee families alphabetically before all ranged families", () => {
		const families = WEAPON_FAMILY_IDS.map((id) => getWeaponFamily(id)!)
		const firstRanged = families.findIndex(({ type }) => type === "ranged")

		expect(firstRanged).toBeGreaterThan(0)
		expect(families.slice(0, firstRanged).every(({ type }) => type === "melee")).toBe(true)
		expect(families.slice(firstRanged).every(({ type }) => type === "ranged")).toBe(true)

		for (const group of [families.slice(0, firstRanged), families.slice(firstRanged)]) {
			expect(group.map(({ name }) => name)).toEqual(
				group.map(({ name }) => name).sort((a, b) => a.localeCompare(b)),
			)
		}
	})

	test.each(["Cleave Damage", "Defences"])(
		"matches the same Duelling Sword requirement through the %s alias",
		(statName) => {
			const family = getWeaponFamily("combatsword_p3")!
			const stats: BaseStat[] = [{ name: "current-mark-stat-id", value: 0.7 }]

			expect(
				matchesWeaponFamilyStats(
					family,
					stats,
					[{ id: "cleave-damage__defences", min: 70 }],
					() => statName,
				),
			).toBe(true)
		},
	)
})
