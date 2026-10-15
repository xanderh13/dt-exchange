import { describe, expect, test } from "vitest"
import type { BaseStat, Personal, Character } from "../types"
import { compareStoreOffers, filterFunc } from "./Store"

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
	test("matches only selected rarities and leaves unselected rules unrestricted", () => {
		const character = { archetype: "veteran" } as Character
		for (const rarity of [1, 2, 3, 4, 5] as const) {
			const item = offer(`rarity-${rarity}`, 320, undefined)
			item.description.overrides.rarity = rarity
			filterFunc(character, "credits", item, [{ rarities: [1, 2] }], {})
			expect(item.description.overrides.filter_match).toBe(rarity <= 2 ? 0 : -1)
			filterFunc(character, "credits", item, [{ rarities: [1, 5] }, {}], {})
			expect(item.description.overrides.filter_match).toBe(rarity === 1 || rarity === 5 ? 0 : 1)
		}
	})
	test("puts matches in filter priority order before non-matches", () => {
		const offers = [
			offer("non-match-500", 380, -1),
			offer("match-400", 320, 0),
			offer("non-match-400", 320, -1),
			offer("match-500", 380, 1),
		]

		offers.sort((a, b) => compareStoreOffers(a, b, "itemRating", true))

		expect(offers.map(({ offerId }) => offerId)).toEqual([
			"match-400",
			"match-500",
			"non-match-500",
			"non-match-400",
		])
	})

	test("sorts each filter group by fractional power and resolves exact ties consistently", () => {
		const offers = [
			offer("lower", 320.1, 0),
			offer("b", 320.2, 0),
			offer("a", 320.2, 0),
			offer("later-rule", 380, 1),
		]
		const sort = (items: Personal[]) =>
			items.sort((a, b) => compareStoreOffers(a, b, "itemRating", true))
		expect(sort([...offers]).map(({ offerId }) => offerId)).toEqual([
			"a",
			"b",
			"lower",
			"later-rule",
		])
		expect(sort([...offers].reverse())).toEqual(sort([...offers]))
		expect(compareStoreOffers(offers[0], offers[0], "itemRating", true)).toBe(0)
	})

	test("uses only the selected ordering when match prioritization is disabled", () => {
		const offers = [offer("match-400", 320, 0), offer("non-match-500", 380, -1)]

		offers.sort((a, b) => compareStoreOffers(a, b, "itemRating", false))

		expect(offers.map(({ offerId }) => offerId)).toEqual(["non-match-500", "match-400"])
	})

	test("treats a missing filter result as a non-match", () => {
		const offers = [offer("missing", 320, undefined), offer("match", 320, 0)]

		offers.sort((a, b) => compareStoreOffers(a, b, "itemRating", true))

		expect(offers.map(({ offerId }) => offerId)).toEqual(["match", "missing"])
	})
})
