import type { Items, Perk, Personal, Trait } from "../../types"
import localisation from "../../localisation"
import traitTemplates from "../../trait_templates.json"
import buffTemplates from "../../buff_templates.json"

const warnedMissingTemplates = new Set<string>()

function warnAboutMissingTemplate(kind: "blessing" | "perk", id: string, template?: string) {
	const warningKey = `${kind}:${id}:${template ?? "unknown"}`
	if (warnedMissingTemplates.has(warningKey)) return

	warnedMissingTemplates.add(warningKey)
	console.warn(`Armoury Exchange is missing a ${kind} template`, {
		[`${kind}Id`]: id,
		template,
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
	try {
		return buildBlessingDescription(trait, offer, items)
	} catch (error) {
		console.warn("Armoury Exchange could not format a blessing description", {
			traitId: trait.id,
			error,
		})
		return localisation[trait.id].description
	}
}

function buildBlessingDescription(trait: Trait, _offer: Personal, items: Items): string {
	let desc = localisation[trait.id].description
	const item = items?.[trait.id]
	const traitTemplate = item?.trait
		? (traitTemplates as Record<string, any>)[item.trait]
		: undefined

	// The live store and master list can be updated before the bundled game-data snapshot. Showing
	// the localized fallback is preferable to taking down every offer (and the whole extension).
	if (!traitTemplate) {
		warnAboutMissingTemplate("blessing", trait.id, item?.trait)
		return desc
	}

	let statBuffTemplate = (buffTemplates as Record<string, any>)[traitTemplate.name]
	let statBuffs =
		statBuffTemplate && (statBuffTemplate.stat_buffs || statBuffTemplate.lerped_stat_buffs)
	let formatValues = traitTemplate.format_values
	let buffs = traitTemplate.buffs

	if (formatValues) {
		for (const [key, value] of Object.entries(formatValues)) {
			let find_value = value.find_value
			let buffValue = ""
			if (find_value) {
				if (find_value.find_value_type === "buff_template") {
					let buffTemplate = buffTemplates[find_value.buff_template_name]
					let value = getIn(buffTemplate, find_value.path)
					desc = desc.replaceAll(`{${key}:%s}`, value?.toString() ?? "")
				} else if (find_value.find_value_type === "rarity_value") {
					let val = value.find_value.trait_value[trait.rarity - 1]
					desc = desc.replaceAll(`{${key}:%s}`, val?.toString() ?? "")
				} else {
					buffValue = String(
						getIn(
							buffs?.[value.find_value.buff_template_name]?.[trait.rarity - 1],
							value.find_value.path,
						),
					)
				}

				if (value.format_type === "percentage") {
					buffValue = (parseFloat(buffValue) * 100).toFixed(0) + "%"
				}

				if (value.prefix) {
					buffValue = value.prefix + buffValue
				}

				desc = desc.replaceAll(`{${key}:%s}`, buffValue?.toString() ?? "")
			} else {
				if (value.format_type === "string") {
					desc = desc.replaceAll(`{${key}:%s}`, value.value ?? "")
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
	try {
		return buildPerkDescription(perk, items)
	} catch (error) {
		console.warn("Armoury Exchange could not format a perk description", {
			perkId: perk.id,
			error,
		})
		return localisation[perk.id].description
	}
}

function buildPerkDescription(perk: Perk, items: Items): string {
	let desc = localisation[perk.id].description
	const item = items?.[perk.id]
	const traitTemplate = item?.trait
		? (traitTemplates as Record<string, any>)[item.trait]
		: undefined

	if (!traitTemplate) {
		warnAboutMissingTemplate("perk", perk.id, item?.trait)
		return desc
	}

	let formatValues = traitTemplate.format_values
	let buffs = traitTemplate.buffs

	for (const [key, value] of Object.entries(formatValues ?? {}) as [string, any][]) {
		let buffValue = String(
			getIn(buffs?.[value.find_value.buff_template_name]?.[perk.rarity - 1], value.find_value.path),
		)

		if (value.format_type === "percentage") {
			buffValue = (parseFloat(buffValue) * 100).toFixed(0) + "%"
		}

		if (value.prefix) {
			buffValue = value.prefix + buffValue
		}

		desc = desc.replaceAll(`{${key}:%s}`, buffValue?.toString() ?? "")
	}

	return desc
}
