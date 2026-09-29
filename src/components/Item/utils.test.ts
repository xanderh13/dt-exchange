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

		expect(
			getBlessingDescription({ id: traitId, rarity: 4 }, huntsmanOffer, items),
		).toBe("6 Bleed Stacks on Critical Hit.")
		expect(warn).not.toHaveBeenCalled()
	})

	test("applies the same compatibility fallback to perks", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})

		expect(() =>
			getPerkDescription({ id: "content/items/perks/from_a_new_game_update", rarity: 4 }, {}),
		).not.toThrow()
	})
})
