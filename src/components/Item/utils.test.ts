import { describe, expect, it } from "vitest"
import type { Items, Personal } from "../../types"
import { getBlessingDescription, getPerkDescription } from "./utils"

const offer = {} as Personal

describe("item description fallbacks", () => {
	it("does not crash when a live blessing is absent from bundled templates", () => {
		const id = "content/items/traits/future_blessing"
		const items = {
			[id]: { trait: "future_blessing_template" },
		} as unknown as Items

		expect(getBlessingDescription({ id, rarity: 4 }, offer, items)).toBe(`<${id}.description>`)
	})

	it("does not crash when a live perk is absent from bundled templates", () => {
		const id = "content/items/traits/future_perk"
		const items = {
			[id]: { trait: "future_perk_template" },
		} as unknown as Items

		expect(getPerkDescription({ id, rarity: 4 }, items)).toBe(`<${id}.description>`)
	})

	it("does not crash when the live master-list entry is absent", () => {
		const id = "content/items/traits/future_trait"

		expect(getBlessingDescription({ id, rarity: 4 }, offer, {})).toBe(`<${id}.description>`)
	})
})
