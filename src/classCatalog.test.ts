import { describe, expect, it } from "vitest"
import { CLASS_LABELS, CLASS_TYPES } from "./types"
import { WEAPON_FAMILIES } from "./weaponCatalog"

describe("DLC character catalog", () => {
	it.each([
		["broker", "Hive Scum"],
		["adamant", "Arbites"],
		["cryptic", "Skitarii"],
	] as const)("supports the %s backend archetype", (id, label) => {
		expect(CLASS_TYPES).toContain(id)
		expect(CLASS_LABELS[id]).toBe(label)
	})

	it("contains the Skitarii weapon families", () => {
		const familyNames = WEAPON_FAMILIES.map(({ name }) => name)
		expect(familyNames).toEqual(
			expect.arrayContaining([
				"Arc Maul",
				"Arc Rifle",
				"Galvanic Rifle",
				"Mechanicus Power Sword",
				"Paired Transonic Blades",
				"Phosphor Blast Pistol",
				"Power Falchion",
			]),
		)
	})
})
