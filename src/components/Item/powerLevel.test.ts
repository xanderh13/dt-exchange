import { describe, expect, test } from "vitest"
import type { BaseStat, Description } from "../../types"
import { calculateItemPower } from "./powerLevel"

const stats = (...values: number[]): BaseStat[] =>
	values.map((value, index) => ({ name: `stat-${index}`, value: value / 100 }))

function description(
	type: Description["type"],
	baseItemLevel: number,
	baseStats?: BaseStat[],
): Description {
	return {
		id: "test-item",
		gearId: "test-gear",
		rotation: "test-rotation",
		type,
		properties: {},
		overrides: {
			ver: 1,
			rarity: 1,
			characterLevel: 30,
			itemLevel: baseItemLevel,
			baseItemLevel,
			traits: [],
			perks: [],
			base_stats: baseStats,
		},
	}
}

describe("calculateItemPower", () => {
	test.each([
		[320, 400],
		[374, 490],
		[379, 490],
		[380, 500],
	])("converts a weapon modifier total of %i to Power %i", (total, expected) => {
		expect(calculateItemPower(description("weapons", total, stats(total)))).toBe(expected)
	})

	test("rounds the weapon modifier sum the same way as the game", () => {
		const fractionalStats: BaseStat[] = [
			{ name: "one", value: 0.749 },
			{ name: "two", value: 0.751 },
			{ name: "three", value: 0.75 },
			{ name: "four", value: 0.75 },
			{ name: "five", value: 0.8 },
		]

		expect(calculateItemPower(description("weapons", 380, fractionalStats))).toBe(500)
	})

	test.each([
		[67, 360],
		[68, 360],
		[69, 370],
		[76, 410],
		[77, 410],
		[78, 420],
		[79, 420],
		[80, 430],
	])("converts curio base level %i to Power %i", (baseItemLevel, expected) => {
		expect(calculateItemPower(description("gadget", baseItemLevel))).toBe(expected)
	})
})
