import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const weaponsUrl = "https://darktide.gameslantern.com/api/weapons?page=1"

const newWeapons = {
	"Accatran Mk III Huntsman's Shotgun": {
		id: "content/items/weapons/player/ranged/shotgun_p3_m1",
		stats: {
			shotgun_p3_m1_ammo_stat: "Ammo",
			shotgun_p3_m1_power_stat: "Stopping Power",
			shotgun_p3_m1_stability_stat: "Stability",
			shotgun_p3_m1_dps_stat: "Damage",
			shotgun_p3_m1_mobility_stat: "Mobility",
		},
	},
	"Branx Mk CV Galvanic Rifle": {
		id: "content/items/weapons/player/ranged/galvanic_rifle_p1_m1",
		stats: {
			galvanic_rifle_p1_m1_dps_stat: "Damage",
			galvanic_rifle_p1_m1_ammo_stat: "Ammo",
			galvanic_rifle_p1_m1_power_stat: "Stopping Power",
			galvanic_rifle_p1_m1_finesse_stat: "Finesse",
			galvanic_rifle_p1_m1_mobility_stat: "Mobility",
		},
	},
	"Branx Mk III Arc Maul": {
		id: "content/items/weapons/player/melee/powermaul_p3_m1",
		stats: {
			powermaul_p3_m1_dps_stat: "Damage",
			powermaul_p3_m1_armor_pierce_stat: "Penetration",
			powermaul_p3_m1_control_stat: "Crowd Control",
			powermaul_p3_m1_arc_stat: "Arc Efficiency",
			powermaul_p3_m1_mobility_stat: "Mobility",
		},
	},
	"Branx Mk IV Arc Rifle": {
		id: "content/items/weapons/player/ranged/arc_rifle_p1_m1",
		stats: {
			arc_rifle_p1_m1_dps_stat: "Damage",
			arc_rifle_p1_m1_reload_speed_stat: "Reload Speed",
			arc_rifle_p1_m1_arc_stat: "Arc Efficiency",
			arc_rifle_p1_m1_mobility_stat: "Mobility",
			arc_rifle_p1_m1_ammo_stat: "Ammo",
		},
	},
	"Branx Mk VI Mechanicus Power Sword": {
		id: "content/items/weapons/player/melee/powersword_p3_m1",
		stats: {
			powersword_p3_m1_dps_stat: "Damage",
			powersword_p3_m1_first_target_stat: "First Target",
			powersword_p3_m1_power_output_stat: "Power Output",
			powersword_p3_m1_finesse_stat: "Finesse",
			powersword_p3_m1_mobility_stat: "Mobility",
		},
	},
	"Branx Mk XI Paired Transonic Blades": {
		id: "content/items/weapons/player/melee/transonic_sword_transonic_knife_p1_m1",
		stats: {
			transonic_sword_transonic_knife_p1_m1_dps_stat: "Damage",
			transonic_sword_transonic_knife_p1_m1_cleave_damage_and_targets_stat:
				"Cleave Efficiency",
			transonic_sword_transonic_knife_p1_m1_crit_stat: "Critical Bonus",
			transonic_sword_transonic_knife_p1_m1_finesse_stat: "Finesse",
			transonic_sword_transonic_knife_p1_m1_armor_pierce_stat: "Penetration",
		},
	},
	"Branx Mk XI Phosphor Blast Pistol": {
		id: "content/items/weapons/player/ranged/phosphor_pistol_p1_m1",
		stats: {
			phosphor_pistol_p1_m1_dps_stat: "Damage",
			phosphor_pistol_p1_m1_ammo_stat: "Ammo",
			phosphor_pistol_p1_m1_mobility_stat: "Mobility",
			phosphor_pistol_p1_m1_armor_piercing_stat: "Penetration",
			phosphor_pistol_p1_m1_crit_stat: "Critical Bonus",
		},
	},
	"Gromm Mk I & Mk V Battle Maul & Slab Shield": {
		id: "content/items/weapons/player/melee/ogryn_powermaul_slabshield_p1_m2",
		stats: {
			ogryn_powermaul_slabshield_cleave_damage_stat: "Cleave Damage",
			ogryn_powermaul_slabshield_armor_pierce_stat: "Penetration",
			ogryn_powermaul_slabshield_control_stat: "Crowd Control",
			ogryn_powermaul_slabshield_defence_stat: "Defences",
			ogryn_powermaul_slabshield_dps_stat: "Damage",
		},
	},
	"Krourk Mk IIa Cruncher": {
		id: "content/items/weapons/player/melee/ogryn_hammer_2h_p1_m1",
		stats: {
			ogryn_hammer_2h_p1_m1_armor_pierce_stat: "Penetration",
			ogryn_hammer_2h_p1_m1_first_target_stat: "First Target",
			ogryn_hammer_2h_p1_m1_control_stat: "Crowd Control",
			ogryn_hammer_2h_p1_m1_defence_stat: "Defences",
			ogryn_hammer_2h_p1_m1_dps_stat: "Damage",
		},
	},
	"Krourk Mk IV Double-Barrelled Shotgun": {
		id: "content/items/weapons/player/ranged/shotgun_p2_m3",
		stats: {
			shotgun_p2_m3_power_stat: "Stopping Power",
			shotgun_p2_m3_reload_speed_stat: "Reload Speed",
			shotgun_p2_m3_range_stat: "Range",
			shotgun_p2_m3_dps_stat: "Damage",
			shotgun_p2_m3_mobility_stat: "Mobility",
		},
	},
	"Krourk Mk VII Crusher": {
		id: "content/items/weapons/player/melee/powermaul_2h_p1_m2",
		stats: {
			ogryn_powermaul_power_output_stat: "Power Output",
			powermaul_2h_armor_pierce_stat: "Penetration",
			powermaul_2h_control_stat: "Crowd Control",
			powermaul_2h_defence_stat: "Defences",
			powermaul_2h_dps_stat: "Damage",
		},
	},
	"Lorenz Mk VII Thugshot": {
		id: "content/items/weapons/player/ranged/ogryn_thumper_p1_m3",
		stats: {
			ogryn_thumper_p1_m3_power_stat: "Stopping Power",
			ogryn_thumper_p1_m3_reload_speed_stat: "Reload Speed",
			ogryn_thumper_p1_m3_range_stat: "Range",
			ogryn_thumper_p1_m3_dps_stat: "Damage",
			ogryn_thumper_p1_m3_mobility_stat: "Mobility",
		},
	},
	"M35 Magnacore Mk III Plasma Gun": {
		id: "content/items/weapons/player/ranged/plasmagun_p1_m2",
		stats: {
			plasmagun_p1_m2_dps_stat: "Damage",
			plasmagun_p1_m2_power_stat: "Stopping Power",
			plasmagun_charge_cost_stat: "Thermal Resistance",
			plasmagun_charge_speed_stat: "Charge Rate",
			plasmagun_p1_m2_ammo_stat: "Ammo",
		},
	},
}

const normalise = (value = "") =>
	value
		.normalize("NFKD")
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase()

const jsonString = (value) => JSON.stringify(value).replaceAll("/", "\\/")

const stringifyLocalisation = (values) => {
	const entries = Object.entries(values).map(([id, value]) => {
		const fields = Object.entries(value)
		if (fields.length === 1) {
			const [name, text] = fields[0]
			return `\t${jsonString(id)}: { ${jsonString(name)}: ${jsonString(text)} }`
		}

		const body = fields
			.map(([name, text]) => `\t\t${jsonString(name)}: ${jsonString(text)}`)
			.join(",\n")
		return `\t${jsonString(id)}: {\n${body}\n\t}`
	})

	return `{\n${entries.join(",\n")}\n}\n`
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const localisationPath = path.join(root, "src/localisation.json")
const localisation = JSON.parse(await readFile(localisationPath, "utf8"))

const response = await fetch(weaponsUrl, {
	headers: { "X-Requested-With": "XMLHttpRequest" },
})

if (!response.ok) {
	throw new Error(`Unable to fetch ${weaponsUrl}: ${response.status} ${response.statusText}`)
}

const payload = await response.json()
if (!Array.isArray(payload.data) || payload.data.length === 0) {
	throw new Error("The weapon catalog response did not contain any weapons")
}

const existingWeapons = Object.entries(localisation).filter(
	([id, value]) => id.startsWith("content/items/weapons/player/") && value.display_name,
)

const byDescription = new Map()
const byName = new Map()

for (const [id, value] of existingWeapons) {
	if (value.description) {
		const key = normalise(value.description)
		byDescription.set(key, [...(byDescription.get(key) ?? []), id])
	}

	const key = normalise(value.display_name)
	byName.set(key, [...(byName.get(key) ?? []), id])
}

const selectUnique = (matches) => (matches?.length === 1 ? matches[0] : undefined)
const unmatched = []
let updated = 0
let added = 0

for (const weapon of payload.data) {
	let id = selectUnique(byDescription.get(normalise(weapon.description)))
	id ??= selectUnique(byName.get(normalise(weapon.name)))
	id ??= newWeapons[weapon.name]?.id

	if (!id) {
		unmatched.push(weapon.name)
		continue
	}

	const existing = localisation[id]
	if (existing) {
		updated++
		existing.display_name = weapon.name
		existing.description = weapon.description
	} else {
		added++
		localisation[id] = {
			description: weapon.description,
			display_name: weapon.name,
		}
	}
}

if (unmatched.length > 0) {
	throw new Error(`Unmapped catalog weapons:\n- ${unmatched.join("\n- ")}`)
}

for (const weapon of Object.values(newWeapons)) {
	for (const [id, display_name] of Object.entries(weapon.stats)) {
		localisation[id] = { display_name }
	}
}

await writeFile(localisationPath, stringifyLocalisation(localisation))

console.log(
	`Updated ${updated} weapon entries and added ${added} weapon entries from Games Lantern (${payload.data.length} catalog entries).`,
)
