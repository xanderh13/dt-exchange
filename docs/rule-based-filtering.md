# Rule-based filtering

Rule-based filtering allows you to setup rules for items you're interested in the shop.

Basic layout looks like this:

```
[
RULE-1,
RULE-2,
...
RULE-n
]
```

Multiple rules can be defined successively, with each item in a shop being compared against every rule separately and considered a match if it matches one or more of the rules.

Each `RULE` contains one or more filters, that each need to match for that specific rule to be considered a match:

```
{
FILTER-1,
FILTER-2,
...
FILTER-n
}
```

where each `FILTER` is some type of `"key": value` pair, explained further below.

Note: The format is called JSON and it can be quite strict with formatting. If you feel like your configuration should work but it doesn't, it's usually good idea to check with a tool like https://jsoneditoronline.org/ to make sure you're not missing comma or a quote from somewhere.

## Evaluation order

Rules are checked in the order they're defined. Item is (only) considered to be a match for the topmost rule it matches. While this doesn't matter in many cases, it does matter if you're using some of the rule-specific customization options like `color`. This means that usually you'll want your more specific rules be at the top and ones that match wider set of items at the bottom.

## Supported filters

### Array based

Array filters (`[]`) allow listing **one or more** matches. If the item matches _any_ of the array contents it's considered a match for that filter. If only one value is specified the brackets are optional: `"character": "psyker"` is evaluated the same way as `"character": ["psyker"]`

- `character`: character archetype(s) that has the item in their store
  - possible values: `veteran`, `psyker`, `ogryn`, `zealot`
  - example: `"character": ["psyker", "veteran"]`
- `item`: item name(s)
  - possible values: any part of item name
  - example: `"item": ["Mk V Infantry Autogun", "Recon Lasgun"]`
- `blessing`: blessing name(s)
  - possible values: any part of the blessings **name**
  - example: `"blessing": ["Deflect", "Brutal Momentum"]`
- `perk`: perk name(s)
  - possible values: any part of the perks **description**
  - example: `"perk": ["Sprint Efficiency", "Critical Hit Chance"]`
- `type`: item type
  - possible values: `curio`, `ranged` or `melee`
  - example: `"type": ["melee", "ranged"]`
- `dumpStat`: require an exact `80/80/80/80/60` maximum-potential distribution and select which modifier is the 60. Use `any` to accept any dump stat, or list multiple acceptable names.
  - example: `"dumpStat": "Mobility"`
  - example: `"dumpStat": ["Mobility", "Defences"]`

### Numeric

Numeric filters are just normal integers, only a single value can be defined at a time.

- `minStats`: minimum sum of all modifiers combined
  - example: `"minStats": 360`
- `minRating`: minimum in-game Power of the item (the legacy field name is retained for saved-filter compatibility)
  - example: `"minRating": 500`
- `minBlessingRarity`: requirement for a blessing to be of specific rarity, if there are multiple blessings it's considered a match if any of the blessings has this rarity.
  - possible values: `1`, `2`, `3`, `4`
  - example: `"minBlessingRarity": 3`
- `minPerkRarity`: same as above, but for perks
  - possible values: `1`, `2`, `3`, `4`
  - example: `"minPerkRarity": 4`
- `minCurioStat`: minimum value for the selected curio main stat. The visual editor limits
  Toughness to 13–17%, Health to 17–21%, and Stamina to 1–3. Wounds are always +1 and do not use
  this field.
  - example: `"minCurioStat": 17`
- `stats`: minimum maximum-potential values for named weapon modifiers. Every entry must match.
  - example: `"stats": [{ "name": "Mobility", "min": 60 }]`
- `weaponStats`: minimum maximum-potential values for the selected `weaponFamily`. The visual
  editor creates these entries and leaves blank modifiers unrestricted. A slot can cover renamed
  modifiers across swappable marks, such as `Cleave Damage / Defences` on Duelling Swords.
  - example:
    `"weaponStats": [{ "id": "cleave-damage__defences", "min": 70 }, { "id": "finesse", "min": 80 }]`

### Strings

String filters allow defining only a single possible value.

- `store`: require item to be in a specific shop
  - possible values: `credits`, `marks`
  - example: `"store": "marks"`
- `weaponFamily`: the stable family ID selected by the visual editor. It matches every swappable
  mark in that family by its exact Atoma item ID.
  - example: `"weaponFamily": "combatsword_p3"` for Duelling Swords
- `curioStat`: the curio's main stat, independent of its cosmetic name.
  - possible values: `toughness`, `health`, `stamina`, `wound`
  - example: `"curioStat": "toughness"`

### Meta

In addition there are some fields that are not filters, but instead allow additional customization

- `color`: color the matching item with this color (values are picked from the topmost rule that the item matches)
  - possible values: any HTML color code, e.g. `"blue"`, `#ff5733`
  - example: `"color": "#ff5733"`

## Default configuration

By default the configuration looks like this:

```json
[
	{
		"minStats": 360
	}
]
```

This is a configuration with single rule that has a single filter. This specific filter requires the item to have total sum of items modifier percentages to be 360 or more to be considered a match.

## Advanced examples

Lets consider the following example:

```json
[
	{
		"item": "Power Sword",
		"blessing": "Power Cycler"
	},
	{
		"item": ["Kantrael MG XII Infantry Lasgun", "Recon Lasgun"],
		"blessing": ["Infernus", "Ghost"]
	},
	{
		"minStats": 360
	},
	{
		"minBlessingRarity": 3,
		"store": "credits"
	},
	{
		"character": "veteran",
		"type": "curio",
		"blessing": "Endurance",
		"perk": "Block Efficiency",
		"minRating": 80
	}
]
```

This configuration contains five separate rules with various amounts of filters each. As mentioned before, each rule is matched separately, and as long as any of them matches an item it's considered a match.

The five rules in this configurations are the following:

### Example: Item with specific blessing

```json
{
	"item": "Power Sword",
	"blessing": "Power Cycler"
}
```

This would match any Power Sword with the blessing `Power Cycler`. Since there is only one item that has `Power Sword` in it's name there's no need to write the complete name of the item.

```json
{
	"item": ["Kantrael MG XII Infantry Lasgun", "Recon Lasgun"],
	"blessing": ["Infernus", "Ghost"]
}
```

Similar to the first one, but here we're looking either for a specific variation of the Infantry Lasgun or any type of Recon Lasgun. In order to match specific Infrantry Lasgun variant we are required to write down more specific name. It's not required to write the whole name, variations that would also work are things like `Kantrael MG XII` or `XII Infantry Lasgun`.

In addition we're looking for more than one possible blessing, so they're inside square brackets. Note that while the filter spans multiple lines, it's exactly same as `"blessing": ["Infernus","Ghost"]`.

### Example: any item with good enough combined stats

```json
{
	"minStats": 360
}
```

This rule will match any shop item that has sum of all stat modifiers combined 360 or larger. While it's here as its own rule, it can be combined with any other filters just like anything else.

### Example: perfect weapon potential with Mobility as the dump stat

```json
{
	"dumpStat": "Mobility"
}
```

This matches weapons whose maximum-potential distribution is exactly `80/80/80/80/60`, with Mobility as the single 60% modifier. Use `"dumpStat": "any"` if the identity of the dump stat does not matter.

### Example: a nonstandard Duelling Sword split

```json
{
	"weaponFamily": "combatsword_p3",
	"weaponStats": [
		{ "id": "cleave-damage__defences", "min": 70 },
		{ "id": "penetration", "min": 70 },
		{ "id": "finesse", "min": 80 },
		{ "id": "damage", "min": 80 }
	]
}
```

This matches all Duelling Sword marks. The first requirement checks Cleave Damage on Mk II/Mk IV
and Defences on Mk V, mirroring the game's modifier mapping when marks are swapped. Mobility is
omitted, so any Mobility value is accepted.

### Example: any blessing with higher rarity

```json
{
	"minBlessingRarity": 3,
	"store": "credits"
}
```

This rule will match any item in the hourly shop that has blessing of rarity 3 or higher.

### Example: curios for specific character

```json
{
	"character": "veteran",
	"type": "curio",
	"curioStat": "toughness",
	"minCurioStat": 17,
	"perk": "Block Efficiency",
	"minRating": 80
}
```

This would look for a 17% Toughness curio with Block Efficiency that is available to your
`veteran` character.
