import { describe, expect, test } from "vitest"
import type { BaseStat } from "./types"
import {
	getWeaponFamily,
	getWeaponFamilyForItem,
	matchesWeaponFamilyStats,
	WEAPON_FAMILIES,
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
			}
		}
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
