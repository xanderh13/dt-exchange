import { describe, expect, test } from "vitest"
import type { FormFilterRule } from "../../types"
import { formDataToRules, rulesToFormData } from "./RuleBasedFilters.service"

function formRule(overrides: Partial<FormFilterRule> = {}): FormFilterRule {
	return {
		character: "",
		item: "",
		weaponFamily: "",
		weaponStats: [],
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

describe("weapon family rule conversion", () => {
	test("stores only populated modifier requirements", () => {
		const [rule] = formDataToRules([
			formRule({
				weaponFamily: "combatsword_p3",
				weaponStats: [
					{ id: "cleave-damage__defences", min: "70" },
					{ id: "penetration", min: "" },
					{ id: "finesse", min: "80" },
					{ id: "damage", min: "0" },
					{ id: "mobility", min: "" },
				],
			}),
		])

		expect(rule?.weaponFamily).toBe("combatsword_p3")
		expect(rule?.weaponStats).toEqual([
			{ id: "cleave-damage__defences", min: 70 },
			{ id: "finesse", min: 80 },
		])
	})

	test("restores all five family slots and leaves unspecified values blank", () => {
		const [form] = rulesToFormData([
			{
				weaponFamily: "combatsword_p3",
				weaponStats: [{ id: "cleave-damage__defences", min: 70 }],
			},
		])

		expect(form?.weaponStats).toEqual([
			{ id: "cleave-damage__defences", min: "70" },
			{ id: "penetration", min: "" },
			{ id: "finesse", min: "" },
			{ id: "damage", min: "" },
			{ id: "mobility", min: "" },
		])
	})
})
