import { describe, expect, test } from "vitest"
import type { FormFilterRule } from "../../types"
import { formDataToRules, rulesToFormData } from "./RuleBasedFilters.service"

function formRule(overrides: Partial<FormFilterRule> = {}): FormFilterRule {
	return {
		character: "",
		item: "",
		type: "",
		blessing: "",
		perk: "",
		dumpStat: "",
		store: "",
		minBlessingRarity: "0",
		minPerkRarity: "0",
		minStats: "0",
		minRating: "0",
		color: "",
		stats: [],
		isOpen: true,
		...overrides,
	}
}

describe("dump stat rule conversion", () => {
	test("converts comma-separated dump stat names to a filter array", () => {
		const [rule] = formDataToRules([formRule({ dumpStat: "Mobility, Defences" })])

		expect(rule?.dumpStat).toEqual(["Mobility", "Defences"])
	})

	test("restores a dump stat filter for the form editor", () => {
		const [form] = rulesToFormData([{ dumpStat: ["Mobility", "Defences"] }])

		expect(form?.dumpStat).toBe("Mobility, Defences")
	})
})
