import type { Items, Perk, Personal, Trait } from "../../types"
import localisation from "../../localisation"
import traitTemplates from "../../trait_templates.json"
import buffTemplates from "../../buff_templates.json"
import { getWeaponBlessing } from "../../weaponCatalog"

const traitTemplatesByName = traitTemplates as Record<string, any>
const buffTemplatesByName = buffTemplates as Record<string, any>

function fallbackDescription(description: string): string {
	return description.replaceAll(/\{[^{}]+:%s\}/g, "?")
}

function warnAboutMissingTemplate(kind: "blessing" | "perk", id: string, template?: string) {
	console.warn(`Unable to calculate ${kind} values from bundled game data`, {
		id,
		template: template ?? "<missing item metadata>",
	})
}

// Linearly interpolate input between min and max. E.g. lerp(1, 2, 0.5) returns 1.5
function lerp(min: number, max: number, input: number): number {
	// Make sure input is a unit interval (0 <= n <= 1)
	let clampedInput = Math.min(Math.max(input, 0.0), 1.0)
	return min * (1 - clampedInput) + max * clampedInput
}

function getIn(obj: any, path: string[]): any {
	return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
}

function lerpSteppedValue(range: number[], lerpValue: number): number {
	const min = 1
	const max = range.length
	// Linear interpolation between min and max
	const lerpedValue = min + (max - min) * lerpValue
	const index = Math.round(lerpedValue)
	// Adjust for 0-based indexing in JS/TS
	return range[index - 1] ?? 0
}

export function getBlessingDescription(trait: Trait, offer: Personal, items: Items): string {
	const currentBlessing = getWeaponBlessing(offer.description.id, trait.id)
	let desc = localisation[trait.id].description
	let item = items?.[trait.id] as (Items[string] & { trait?: string }) | undefined
	let traitTemplate = item?.trait ? traitTemplatesByName[item.trait] : undefined
	if (!traitTemplate) {
		if (currentBlessing) return currentBlessing.effect
		warnAboutMissingTemplate("blessing", trait.id, item?.trait)
		return fallbackDescription(desc)
	}

	let statBuffTemplate = buffTemplatesByName[traitTemplate.name]
	let statBuffs =
		statBuffTemplate && (statBuffTemplate.stat_buffs || statBuffTemplate.lerped_stat_buffs)
	let formatValues = traitTemplate.format_values
	let buffs = traitTemplate.buffs

	if (formatValues) {
		for (const [key, value] of Object.entries(formatValues)) {
			const formatValue = value as any
			let find_value = formatValue.find_value
			let buffValue = ""
			if (find_value) {
				if (find_value.find_value_type === "buff_template") {
					let buffTemplate = buffTemplatesByName[find_value.buff_template_name]
					let value = getIn(buffTemplate, find_value.path)
					desc = desc.replaceAll(`{${key}:%s}`, value?.toString() ?? "")
				} else if (find_value.find_value_type === "rarity_value") {
					let val = formatValue.find_value.trait_value[trait.rarity - 1]
					desc = desc.replaceAll(`{${key}:%s}`, val?.toString() ?? "")
				} else {
					buffValue = String(
						getIn(
							buffs?.[formatValue.find_value.buff_template_name]?.[trait.rarity - 1],
							formatValue.find_value.path,
						) ?? "",
					)
				}

				if (formatValue.format_type === "percentage") {
					buffValue = (parseFloat(buffValue) * 100).toFixed(0) + "%"
				}

				if (formatValue.prefix) {
					buffValue = formatValue.prefix + buffValue
				}

				desc = desc.replaceAll(`{${key}:%s}`, buffValue?.toString() ?? "")
			} else {
				if (formatValue.format_type === "string") {
					desc = desc.replaceAll(`{${key}:%s}`, formatValue.value ?? "")
				}
			}
		}
	}

	if (statBuffs) {
		for (const [key, value] of Object.entries(statBuffs)) {
			let val: string = ""
			// Type guard for min/max object
			const lerpValue = typeof trait.value === "number" ? trait.value : 0
			if (
				value &&
				typeof value === "object" &&
				!Array.isArray(value) &&
				"min" in value &&
				"max" in value &&
				typeof (value as any).min === "number" &&
				typeof (value as any).max === "number"
			) {
				const min = (value as { min: number; max: number }).min
				const max = (value as { min: number; max: number }).max
				let lerped = lerp(min, max, lerpValue)
				if (
					statBuffTemplate.localization_info &&
					statBuffTemplate.localization_info[key] === "percentage"
				) {
					val = (lerped * 100).toFixed(0) + "%"
				} else {
					val = lerped.toString()
				}
			} else if (Array.isArray(value)) {
				val = lerpSteppedValue(value as number[], lerpValue).toString()
			} else {
				val = value?.toString?.() ?? ""
			}
			desc = desc.replaceAll(`{${key}:%s}`, val)
		}
	}

	if (desc.includes("{") || desc.includes("}")) {
		console.log({ desc, trait, item, traitTemplate, statBuffTemplate, statBuffs, formatValues })
	}

	return desc
}

export function getPerkDescription(perk: Perk, items: Items): string {
	let desc = localisation[perk.id].description
	let item = items?.[perk.id] as (Items[string] & { trait?: string }) | undefined
	let traitTemplate = item?.trait ? traitTemplatesByName[item.trait] : undefined
	if (!traitTemplate) {
		warnAboutMissingTemplate("perk", perk.id, item?.trait)
		return fallbackDescription(desc)
	}

	let formatValues = traitTemplate.format_values
	let buffs = traitTemplate.buffs

	for (const [key, value] of Object.entries(formatValues)) {
		const formatValue = value as any
		let buffValue = String(
			getIn(
				buffs?.[formatValue.find_value.buff_template_name]?.[perk.rarity - 1],
				formatValue.find_value.path,
			) ?? "",
		)

		if (formatValue.format_type === "percentage") {
			buffValue = (parseFloat(buffValue) * 100).toFixed(0) + "%"
		}

		if (formatValue.prefix) {
			buffValue = formatValue.prefix + buffValue
		}

		desc = desc.replaceAll(`{${key}:%s}`, buffValue?.toString() ?? "")
	}

	return desc
}
