import { describe, expect, test } from "vitest"
import type { BaseStat } from "../../types"
import { calculateMaxBaseStats, findDumpStat, matchesDumpStatName } from "./baseStats"

const stats = (...values: number[]): BaseStat[] =>
	values.map((value, index) => ({ name: `stat-${index}`, value: value / 100 }))

describe("calculateMaxBaseStats", () => {
	test("fills the 380 potential budget without taking a stat above 80", () => {
		expect(calculateMaxBaseStats(stats(50, 50, 50, 50, 30))).toEqual(stats(80, 80, 80, 80, 60))
	})

	test("continues a partially completed empowerment round first", () => {
		const increases = stats(1, 0, 1, 1, 1)

		expect(calculateMaxBaseStats(stats(75, 75, 75, 75, 75), increases)).toEqual(
			stats(76, 77, 76, 76, 75),
		)
	})

	test("redistributes remaining potential after stats reach 80", () => {
		expect(calculateMaxBaseStats(stats(80, 80, 80, 70, 65))).toEqual(stats(80, 80, 80, 73, 67))
	})

	test("does not mutate the API data", () => {
		const currentStats = stats(50, 50, 50, 50, 30)

		calculateMaxBaseStats(currentStats)

		expect(currentStats).toEqual(stats(50, 50, 50, 50, 30))
	})
})

describe("findDumpStat", () => {
	test("returns the lone 60 from a perfect dump distribution", () => {
		expect(findDumpStat(stats(80, 80, 60, 80, 80))).toEqual({
			name: "stat-2",
			value: 0.6,
		})
	})

	test.each([[stats(80, 80, 80, 70, 70)], [stats(80, 80, 80, 79, 61)], [stats(80, 80, 80, 80)]])(
		"rejects a non-perfect distribution",
		(maxStats) => {
			expect(findDumpStat(maxStats)).toBeUndefined()
		},
	)
})

describe("matchesDumpStatName", () => {
	test("matches partial dump-stat names without regard to case", () => {
		expect(matchesDumpStatName("Quell Speed", ["quell"])).toBe(true)
		expect(matchesDumpStatName("Quell Speed", ["SPEED"])).toBe(true)
	})

	test("supports any while rejecting unrelated or empty filters", () => {
		expect(matchesDumpStatName("Quell Speed", ["any"])).toBe(true)
		expect(matchesDumpStatName("Quell Speed", ["mobility"])).toBe(false)
		expect(matchesDumpStatName("Quell Speed", [" "])).toBe(false)
	})
})
