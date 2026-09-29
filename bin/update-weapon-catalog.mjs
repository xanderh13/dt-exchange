import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const buildEditorUrl = "https://darktide.gameslantern.com/api/build-editor/initialize"
const weaponsUrl = "https://darktide.gameslantern.com/api/weapons?page=1"
const requestHeaders = {
	Referer: "https://darktide.gameslantern.com/build-editor",
	"X-Requested-With": "XMLHttpRequest",
}

const newTraitSuffixes = {
	"Deadly Frequencies": ["increased_power_on_weapon_special_follow_up_hits"],
	"Enhanced Voltaic Arcs": ["enhanced_arc_jumps_angle"],
	"Machine Spirit Resurgent": ["refund_charge_on_weapon_special_weakspot_kill"],
	"Voltagheist Overload": ["arc_has_killing_blow_chance"],
}

const normalise = (value = "") =>
	value
		.normalize("NFKD")
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase()

const slugify = (value) =>
	normalise(value)
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")

async function fetchJson(url) {
	const response = await fetch(url, { headers: requestHeaders })
	if (!response.ok) {
		throw new Error(`Unable to fetch ${url}: ${response.status} ${response.statusText}`)
	}
	return response.json()
}

function addToMap(map, key, value) {
	map.set(key, [...(map.get(key) ?? []), value])
}

function addUniqueToMap(map, key, value) {
	const values = map.get(key) ?? []
	if (!values.includes(value)) map.set(key, [...values, value])
}

function selectUnique(map, key, description) {
	const matches = map.get(key) ?? []
	if (matches.length !== 1) {
		throw new Error(`${description} mapped to ${matches.length} localisation entries`)
	}
	return matches[0]
}

function groupVariableStats(variableNames, markStats, slotCount) {
	if (variableNames.length === 0) return []

	const neighbours = new Map(variableNames.map((name) => [name, new Set()]))
	for (const stats of markStats) {
		const variables = stats.filter((name) => neighbours.has(name))
		for (let index = 0; index < variables.length; index++) {
			for (let otherIndex = index + 1; otherIndex < variables.length; otherIndex++) {
				neighbours.get(variables[index]).add(variables[otherIndex])
				neighbours.get(variables[otherIndex]).add(variables[index])
			}
		}
	}

	const firstSeen = new Map(variableNames.map((name, index) => [name, index]))
	const orderedNames = [...variableNames].sort(
		(a, b) =>
			neighbours.get(b).size - neighbours.get(a).size || firstSeen.get(a) - firstSeen.get(b),
	)
	const colours = new Map()

	function assign(index, highestColour = -1) {
		if (index === orderedNames.length) return true

		const name = orderedNames[index]
		const unavailable = new Set(
			[...neighbours.get(name)].map((neighbour) => colours.get(neighbour)),
		)
		const highestAllowed = Math.min(highestColour + 1, slotCount - 1)

		for (let colour = 0; colour <= highestAllowed; colour++) {
			if (unavailable.has(colour)) continue
			colours.set(name, colour)
			if (assign(index + 1, Math.max(highestColour, colour))) return true
			colours.delete(name)
		}
		return false
	}

	if (!assign(0)) {
		throw new Error(`Unable to map ${variableNames.join(", ")} into ${slotCount} stat slots`)
	}

	const groups = Array.from({ length: slotCount }, () => [])
	for (const name of variableNames) {
		groups[colours.get(name)].push(name)
	}
	return groups
}

function buildStatSlots(markStats) {
	if (markStats.some((stats) => stats.length !== 5 || new Set(stats).size !== 5)) {
		throw new Error("Every weapon mark must expose exactly five distinct modifier stats")
	}

	const allNames = [...new Set(markStats.flat())]
	const commonNames = allNames.filter((name) => markStats.every((stats) => stats.includes(name)))
	const variableNames = allNames.filter((name) => !commonNames.includes(name))
	const variableGroups = groupVariableStats(variableNames, markStats, 5 - commonNames.length)
	const groups = [...commonNames.map((name) => [name]), ...variableGroups]

	for (const stats of markStats) {
		if (groups.some((group) => stats.filter((name) => group.includes(name)).length !== 1)) {
			throw new Error(`Stat aliases do not describe ${stats.join(", ")}`)
		}
	}

	const orderedGroups = []
	for (const name of markStats[0]) {
		const group = groups.find((candidate) => candidate.includes(name))
		if (group && !orderedGroups.includes(group)) orderedGroups.push(group)
	}
	for (const group of groups) {
		if (!orderedGroups.includes(group)) orderedGroups.push(group)
	}

	return orderedGroups.map((names) => ({
		id: names.map(slugify).sort().join("__"),
		names,
	}))
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const localisationPath = path.join(root, "src/localisation.json")
const outputPath = path.join(root, "src/weaponCatalog.json")
const localisation = JSON.parse(await readFile(localisationPath, "utf8"))

const [buildEditor, weaponResponse] = await Promise.all([
	fetchJson(buildEditorUrl),
	fetchJson(weaponsUrl),
])

if (!Array.isArray(buildEditor.weapon_types) || buildEditor.weapon_types.length === 0) {
	throw new Error("The build editor response did not contain weapon families")
}
if (!Array.isArray(weaponResponse.data) || weaponResponse.data.length === 0) {
	throw new Error("The weapon response did not contain weapon marks")
}

const weaponByApiId = new Map(weaponResponse.data.map((weapon) => [weapon.id, weapon]))
const weaponTraitByApiId = new Map(
	buildEditor.weapon_traits.map((trait) => [trait.id, trait]),
)
const itemIdsByName = new Map()
const localisedNames = new Map()
const traitSuffixesByName = new Map()

for (const [id, value] of Object.entries(localisation)) {
	if (!value.display_name) continue
	addUniqueToMap(localisedNames, normalise(value.display_name), value.display_name)
	if (id.startsWith("content/items/weapons/player/")) {
		addToMap(itemIdsByName, normalise(value.display_name), id)
	}
	if (id.startsWith("content/items/traits/")) {
		addUniqueToMap(
			traitSuffixesByName,
			normalise(value.display_name),
			id.split("/").at(-1),
		)
	}
}

const unmappedBlessingNames = new Set()
const families = buildEditor.weapon_types.map((family) => {
	const marks = family.weapons.map((mark) => {
		const apiWeapon = weaponByApiId.get(mark.id)
		if (!apiWeapon) {
			throw new Error(`${family.name}: ${mark.name} is missing from the weapon catalog`)
		}

		const itemId = selectUnique(
			itemIdsByName,
			normalise(apiWeapon.name),
			`${family.name}: ${apiWeapon.name}`,
		)
		const name = localisation[itemId].display_name
		const statNames = mark.bars.map((bar) =>
			selectUnique(
				localisedNames,
				normalise(bar.name),
				`${family.name}: ${mark.name}: ${bar.name}`,
			),
		)
		const blessings = mark.usable_traits.map((traitId) => {
			const trait = weaponTraitByApiId.get(traitId)
			if (!trait) {
				throw new Error(`${family.name}: ${mark.name}: missing blessing ${traitId}`)
			}

			const traitSuffixes =
				traitSuffixesByName.get(normalise(trait.name)) ?? newTraitSuffixes[trait.name] ?? []
			if (traitSuffixes.length === 0) unmappedBlessingNames.add(trait.name)

			return {
				name: trait.name,
				effect: trait.effect,
				traitSuffixes,
			}
		})

		return { itemId, name, statNames, blessings }
	})

	const familyIds = [
		...new Set(
			marks.map(({ itemId }) =>
				itemId
					.split("/")
					.at(-1)
					.replace(/_m\d+$/, ""),
			),
		),
	]
	if (familyIds.length !== 1) {
		throw new Error(
			`${family.name} mapped to multiple Atoma weapon families: ${familyIds.join(", ")}`,
		)
	}

	const itemTypes = [
		...new Set(family.weapons.map((mark) => weaponByApiId.get(mark.id).type.toLowerCase())),
	]
	if (itemTypes.length !== 1 || !["melee", "ranged"].includes(itemTypes[0])) {
		throw new Error(`${family.name} has an invalid weapon type: ${itemTypes.join(", ")}`)
	}

	return {
		id: familyIds[0],
		name: family.name,
		type: itemTypes[0],
		itemIds: marks.map(({ itemId }) => itemId),
		stats: buildStatSlots(marks.map(({ statNames }) => statNames)),
		marks,
	}
})

const familyIdCounts = new Map()
for (const family of families) {
	familyIdCounts.set(family.id, (familyIdCounts.get(family.id) ?? 0) + 1)
}
for (const family of families) {
	if (familyIdCounts.get(family.id) > 1) {
		family.id = `${family.id}--${slugify(family.name)}`
	}
}

families.sort((a, b) => a.name.localeCompare(b.name))

await writeFile(
	outputPath,
	`${JSON.stringify(
		{
			version: 1,
			sources: {
				buildEditor: buildEditorUrl,
				weapons: weaponsUrl,
				localisation: "src/localisation.json",
			},
			families,
		},
		null,
		"\t",
	)}\n`,
)

const aliasedFamilies = families.filter((family) =>
	family.stats.some((stat) => stat.names.length > 1),
)
console.log(
	`Generated ${families.length} weapon families (${families.reduce(
		(total, family) => total + family.marks.length,
		0,
	)} marks); ${aliasedFamilies.length} families use cross-mark stat aliases.`,
)
if (unmappedBlessingNames.size > 0) {
	console.warn(
		`Blessings without known Atoma trait suffixes: ${[...unmappedBlessingNames].sort().join(", ")}`,
	)
}
