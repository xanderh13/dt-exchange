import { afterEach, describe, expect, test, vi } from "vitest"
import type { Items, Personal } from "../../types"
import { getBlessingDescription, getPerkDescription } from "./utils"

const fallbackOffer = {
	description: { id: "content/items/weapons/player/melee/from_a_new_game_update" },
} as Personal
const huntsmanOffer = {
	description: { id: "content/items/weapons/player/ranged/shotgun_p3_m1" },
} as Personal
const missingTemplateId =
	"content/items/traits/bespoke_combatknife_p1/heavy_chained_hits_increases_killing_blow_chance"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("item descriptions with newer game data", () => {
	test.each([
		[
			"trait_gadget_corruption_resistance",
			"gadget_corruption_resistance",
			"+15% Corruption Resistance",
		],
		[
			"trait_gadget_grim_corruption_resistance",
			"gadget_permanent_damage_resistance",
			"+20% Corruption Resistance (Grimoires)",
		],
		[
			"trait_gadget_dr_vs_gunners",
			"gadget_damage_reduction_vs_gunners",
			"+20% Damage Resistance (Gunners)",
		],
		["trait_gadget_reduced_block_cost", "gadget_block_cost_reduction", "+12% Block Efficiency"],
		["trait_gadget_reduced_sprint_cost", "gadget_sprint_cost_reduction", "+15% Sprint Efficiency"],
		["trait_gadget_health_increase", "gadget_health_increase", "+5% Max Health"],
	])("formats curio perk %s", (suffix, template, expected) => {
		const id = `content/items/perks/gadget_common/${suffix}`
		const items = { [id]: { trait: template } } as unknown as Items
		expect(getPerkDescription({ id, rarity: 4 }, items)).toBe(expected)
	})

	test("shows Deflector's block cost reduction rather than its remaining cost", () => {
		const id = "content/items/traits/bespoke_forcesword_p1/can_block_ranged"
		const items = {
			[id]: { trait: "weapon_trait_bespoke_forcesword_p1_can_block_ranged" },
		} as unknown as Items
		expect(getBlessingDescription({ id, rarity: 4 }, fallbackOffer, items)).toContain("-30%")
	})

	test("falls back to localized blessing text when item metadata is missing", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})

		const description = getBlessingDescription(
			{ id: missingTemplateId, rarity: 4 },
			fallbackOffer,
			{} as Items,
		)

		expect(description).toContain("Instakill human-sized enemies")
		expect(description).toContain("?")
		expect(description).not.toMatch(/\{[^{}]+:%s\}/)
	})

	test("falls back when live item metadata references an unbundled trait template", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const items = {
			[missingTemplateId]: { trait: "weapon_trait_from_a_new_game_update" },
		} as unknown as Items

		expect(() =>
			getBlessingDescription({ id: missingTemplateId, rarity: 4 }, fallbackOffer, items),
		).not.toThrow()
		expect(warn).toHaveBeenCalledWith(
			"Unable to calculate blessing values from bundled game data",
			expect.objectContaining({ template: "weapon_trait_from_a_new_game_update" }),
		)
	})

	test("uses Games Lantern's current effect for a new weapon-family template", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const traitId = "content/items/traits/bespoke_shotgun_p3/bleed_on_crit"
		const items = {
			[traitId]: { trait: "weapon_trait_bespoke_shotgun_p3_bleed_on_crit" },
		} as unknown as Items

		expect(getBlessingDescription({ id: traitId, rarity: 4 }, huntsmanOffer, items)).toBe(
			"6 Bleed Stacks on Critical Hit.",
		)
		expect(warn).not.toHaveBeenCalled()
	})

	test("applies the same compatibility fallback to perks", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})

		expect(() =>
			getPerkDescription({ id: "content/items/perks/from_a_new_game_update", rarity: 4 }, {}),
		).not.toThrow()
	})
})
