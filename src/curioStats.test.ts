import { describe, expect, test } from "vitest"
import type { Trait } from "./types"
import { getCurioStatValue, matchesCurioStat } from "./curioStats"

const trait = (id: string, value?: number) => ({ id, value, rarity: 1 }) as Trait

describe("curio main stats", () => {
	test("calculates the displayed toughness and health values", () => {
		expect(getCurioStatValue("toughness", trait("toughness", 0.8))).toBe(17)
		expect(getCurioStatValue("health", trait("health", 0.8))).toBe(21)
	})

	test("calculates stepped stamina and fixed wounds", () => {
		expect(getCurioStatValue("stamina", trait("stamina", 1))).toBe(3)
		expect(getCurioStatValue("wound", trait("wound"))).toBe(1)
	})

	test("matches the selected trait and its displayed minimum", () => {
		const traits = [
			trait("content/items/traits/gadget_inate_trait/trait_inate_gadget_toughness", 0.8),
		]

		expect(matchesCurioStat(traits, "toughness", 17)).toBe(true)
		expect(matchesCurioStat(traits, "toughness", 18)).toBe(false)
		expect(matchesCurioStat(traits, "health", 17)).toBe(false)
	})
})
