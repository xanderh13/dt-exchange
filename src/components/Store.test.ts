import { describe, expect, test } from "vitest"
import type { BaseStat, Personal } from "../types"
import { compareStoreOffers } from "./Store"

const stats = (total: number): BaseStat[] => [{ name: "damage", value: total / 100 }]

function offer(id: string, modifierTotal: number, filterMatch: number | undefined): Personal {
	return {
		offerId: id,
		description: {
			type: "weapons",
			overrides: {
				base_stats: stats(modifierTotal),
				filter_match: filterMatch,
			},
		},
	} as Personal
}

describe("compareStoreOffers", () => {
	test("puts matches first and retains Power ordering within both groups", () => {
		const offers = [
			offer("non-match-500", 380, -1),
			offer("match-400", 320, 0),
			offer("non-match-400", 320, -1),
			offer("match-500", 380, 1),
		]

		offers.sort((a, b) => compareStoreOffers(a, b, "itemRating", true))

		expect(offers.map(({ offerId }) => offerId)).toEqual([
			"match-500",
			"match-400",
			"non-match-500",
			"non-match-400",
		])
	})

	test("uses only the selected ordering when match prioritization is disabled", () => {
		const offers = [
			offer("match-400", 320, 0),
			offer("non-match-500", 380, -1),
		]

		offers.sort((a, b) => compareStoreOffers(a, b, "itemRating", false))

		expect(offers.map(({ offerId }) => offerId)).toEqual(["non-match-500", "match-400"])
	})

	test("treats a missing filter result as a non-match", () => {
		const offers = [offer("missing", 320, undefined), offer("match", 320, 0)]

		offers.sort((a, b) => compareStoreOffers(a, b, "itemRating", true))

		expect(offers.map(({ offerId }) => offerId)).toEqual(["match", "missing"])
	})
})
