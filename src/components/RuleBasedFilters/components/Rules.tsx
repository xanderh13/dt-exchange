import type React from "react"
import { FormEvent, useState } from "react"
import { Rule } from "./Rule"
import { SplitRuleWrapper } from "./SplitRuleWrapper"
import type { FormFilterRule } from "../../../types"
import "./Rules.css"
import { defaultEmphasisColor, ITEM_OPTIONS, STORE_LABELS, STORE_OPTIONS } from "../../../types"
import { RuleText } from "./RuleText"
import { CloseButton } from "./Buttons/CloseButton"
import { AddStatisticButton } from "./Buttons/AddStatisticButton"
import { getWeaponFamily, WEAPON_FAMILY_IDS, WEAPON_FAMILY_LABELS } from "../../../weaponCatalog"
import {
	CURIO_STAT_LABELS,
	CURIO_STAT_LIMITS,
	CURIO_STATS,
	type CurioStat,
} from "../../../curioStats"

type RulesProps = {
	input: FormFilterRule
	index: number
	onChange: (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
	onStatisticChange: (
		index: number,
		statIndex: number,
		event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => void
	onWeaponStatisticChange: (
		index: number,
		statIndex: number,
		event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => void
	onStatisticAdd: (index: number) => void
	onStatisticRemove: (index: number, statIndex: number) => void
}
export function Rules(props: RulesProps) {
	let [focusedRule, setFocusedRule] = useState<string>("")
	const selectedFamily = getWeaponFamily(props.input.weaponFamily)
	const selectedCurioStat = CURIO_STATS.includes(props.input.curioStat as CurioStat)
		? (props.input.curioStat as CurioStat)
		: undefined

	function handleFormFocus(event: FormEvent<HTMLInputElement | HTMLSelectElement>) {
		const eventTarget: HTMLInputElement = event.target as HTMLInputElement
		setFocusedRule(eventTarget.id)
	}

	return (
		<>
			<div className={"filter-rules-wrapper"}>
				<SplitRuleWrapper columns={3}>
					<Rule
						label={"Store"}
						type={"select"}
						name={"store"}
						index={props.index}
						value={props.input.store}
						focus={focusedRule}
						dataValues={STORE_OPTIONS}
						labels={STORE_LABELS}
						addAnyValue
						onChange={(event) => props.onChange(props.index, event)}
						onFocus={(event) => handleFormFocus(event)}
						onBlur={() => setFocusedRule("")}
					/>
					<Rule
						label={"Item Type"}
						type={"select"}
						name={"type"}
						index={props.index}
						value={props.input.type}
						focus={focusedRule}
						dataValues={ITEM_OPTIONS}
						addAnyValue
						onChange={(event) => props.onChange(props.index, event)}
						onFocus={(event) => handleFormFocus(event)}
						onBlur={() => setFocusedRule("")}
					/>
					<Rule
						label={"Emphasis Color"}
						type={"color"}
						name={"color"}
						index={props.index}
						value={props.input.color || defaultEmphasisColor}
						focus={focusedRule}
						dataValues={["#FF0000", "#F1C40F", "#00FF00", "#00FFFF", "#FF00FF"]}
						onChange={(event) => props.onChange(props.index, event)}
						onFocus={(event) => handleFormFocus(event)}
						onBlur={() => setFocusedRule("")}
					/>
				</SplitRuleWrapper>
				<Rule
					label={"Characters"}
					type={"text"}
					name={"character"}
					index={props.index}
					value={props.input.character}
					focus={focusedRule}
					placeholder={"veteran, zealot, psyker, ogryn"}
					onChange={(event) => props.onChange(props.index, event)}
					onFocus={(event) => handleFormFocus(event)}
					onBlur={() => setFocusedRule("")}
				/>
				{props.input.type === "curio" ? (
					<>
						<SplitRuleWrapper columns={2}>
							<Rule
								label={"Curio Main Stat"}
								type={"select"}
								name={"curioStat"}
								index={props.index}
								value={props.input.curioStat}
								focus={focusedRule}
								dataValues={[...CURIO_STATS]}
								labels={CURIO_STAT_LABELS}
								addAnyValue
								onChange={(event) => props.onChange(props.index, event)}
								onFocus={(event) => handleFormFocus(event)}
								onBlur={() => setFocusedRule("")}
							/>
							{selectedCurioStat && selectedCurioStat !== "wound" ? (
								<Rule
									label={`Minimum ${CURIO_STAT_LABELS[selectedCurioStat]}${
										selectedCurioStat === "toughness" || selectedCurioStat === "health"
											? " (%)"
											: ""
									}`}
									type={"number"}
									min={CURIO_STAT_LIMITS[selectedCurioStat].min}
									max={CURIO_STAT_LIMITS[selectedCurioStat].max}
									name={"minCurioStat"}
									index={props.index}
									value={props.input.minCurioStat}
									focus={focusedRule}
									placeholder={"Any"}
									onChange={(event) => props.onChange(props.index, event)}
									onFocus={(event) => handleFormFocus(event)}
									onBlur={() => setFocusedRule("")}
								/>
							) : (
								<div />
							)}
						</SplitRuleWrapper>
						{props.input.item ? (
							<Rule
								label={"Cosmetic Name (legacy; clear to ignore)"}
								type={"text"}
								name={"item"}
								index={props.index}
								value={props.input.item}
								focus={focusedRule}
								onChange={(event) => props.onChange(props.index, event)}
								onFocus={(event) => handleFormFocus(event)}
								onBlur={() => setFocusedRule("")}
							/>
						) : undefined}
					</>
				) : (
					<>
						<Rule
							label={"Weapon Family"}
							type={"select"}
							name={"weaponFamily"}
							index={props.index}
							value={props.input.weaponFamily}
							focus={focusedRule}
							dataValues={WEAPON_FAMILY_IDS}
							labels={WEAPON_FAMILY_LABELS}
							addAnyValue
							onChange={(event) => props.onChange(props.index, event)}
							onFocus={(event) => handleFormFocus(event)}
							onBlur={() => setFocusedRule("")}
						/>
						{selectedFamily && (
							<div className={"weapon-family-summary"}>
								<RuleText size={"small"}>
									Matches every mark: {selectedFamily.marks.map(({ name }) => name).join(", ")}
								</RuleText>
							</div>
						)}
						<Rule
							label={"Item Name Contains (optional)"}
							type={"text"}
							name={"item"}
							index={props.index}
							value={props.input.item}
							focus={focusedRule}
							placeholder={"Additional partial-name filter (usually leave blank)"}
							onChange={(event) => props.onChange(props.index, event)}
							onFocus={(event) => handleFormFocus(event)}
							onBlur={() => setFocusedRule("")}
						/>
					</>
				)}
				<Rule
					label={"Blessings"}
					type={"text"}
					name={"blessing"}
					index={props.index}
					value={props.input.blessing}
					focus={focusedRule}
					onChange={(event) => props.onChange(props.index, event)}
					onFocus={(event) => handleFormFocus(event)}
					onBlur={() => setFocusedRule("")}
				/>
				<Rule
					label={"Perks"}
					type={"text"}
					name={"perk"}
					index={props.index}
					value={props.input.perk}
					focus={focusedRule}
					onChange={(event) => props.onChange(props.index, event)}
					onFocus={(event) => handleFormFocus(event)}
					onBlur={() => setFocusedRule("")}
				/>
				{props.input.type !== "curio" && (
					<>
						<Rule
							label={"Dump Stat (80/80/80/80/60)"}
							type={"text"}
							name={"dumpStat"}
							index={props.index}
							value={props.input.dumpStat}
							focus={focusedRule}
							placeholder={"Mobility, Defences, or any"}
							onChange={(event) => props.onChange(props.index, event)}
							onFocus={(event) => handleFormFocus(event)}
							onBlur={() => setFocusedRule("")}
						/>
						{selectedFamily ? (
							<>
								<div className={"filter-rules-group-header weapon-stat-header"}>
									<RuleText size={"medium"} padding={"5px 0 0 0"}>
										Maximum Modifier Requirements
									</RuleText>
									<RuleText size={"small"}>Blank values match any roll.</RuleText>
								</div>
								<div className={"weapon-statistics-wrapper"}>
									{selectedFamily.stats.map((stat, statIndex) => (
										<Rule
											key={stat.id}
											label={stat.names.join(" / ")}
											type={"number"}
											min={0}
											max={80}
											name={`weaponStats-${statIndex}-min`}
											index={props.index}
											value={props.input.weaponStats[statIndex]?.min ?? ""}
											focus={focusedRule}
											placeholder={"Any"}
											onChange={(event) =>
												props.onWeaponStatisticChange(props.index, statIndex, event)
											}
											onFocus={(event) => handleFormFocus(event)}
											onBlur={() => setFocusedRule("")}
										/>
									))}
								</div>
							</>
						) : (
							<>
								<div className={"filter-rules-group-header weapon-stat-header"}>
									<RuleText size={"medium"} padding={"5px 0 0 0"}>
										Statistic Rules
									</RuleText>
									<RuleText size={"small"}>
										Select a weapon family above to populate its five modifiers.
									</RuleText>
								</div>
								{props.input.stats?.map((statRule, index) => (
									<div className={"statistics-wrapper"} key={index}>
										<Rule
											label={"Name"}
											type={"text"}
											name={`stats-${index}-name`}
											index={props.index}
											value={statRule.name}
											focus={focusedRule}
											onChange={(event) => props.onStatisticChange(props.index, index, event)}
											onFocus={(event) => handleFormFocus(event)}
											onBlur={() => setFocusedRule("")}
										/>
										<Rule
											label={"Minimum Max Value"}
											type={"number"}
											min={0}
											max={100}
											name={`stats-${index}-min`}
											index={props.index}
											value={statRule.min}
											focus={focusedRule}
											onChange={(event) => props.onStatisticChange(props.index, index, event)}
											onFocus={(event) => handleFormFocus(event)}
											onBlur={() => setFocusedRule("")}
										/>
										<CloseButton
											size={"medium"}
											onClick={() => props.onStatisticRemove(props.index, index)}
										/>
									</div>
								))}
								<AddStatisticButton onClick={() => props.onStatisticAdd(props.index)} />
							</>
						)}
						<div className={"filter-rules-group-header"}>
							<RuleText size={"medium"} padding={"10px 0 0 0"}>
								Minimums
							</RuleText>
						</div>
						<SplitRuleWrapper columns={4}>
							<Rule
								label={"Blessing Rarity"}
								type={"number"}
								min={0}
								max={4}
								name={"minBlessingRarity"}
								index={props.index}
								value={props.input.minBlessingRarity}
								focus={focusedRule}
								onChange={(event) => props.onChange(props.index, event)}
								onFocus={(event) => handleFormFocus(event)}
								onBlur={() => setFocusedRule("")}
							/>
							<Rule
								label={"Perk Rarity"}
								type={"number"}
								min={0}
								max={4}
								name={"minPerkRarity"}
								index={props.index}
								value={props.input.minPerkRarity}
								focus={focusedRule}
								onChange={(event) => props.onChange(props.index, event)}
								onFocus={(event) => handleFormFocus(event)}
								onBlur={() => setFocusedRule("")}
							/>
							<Rule
								label={"Stat Total"}
								type={"number"}
								min={0}
								max={1000}
								name={"minStats"}
								index={props.index}
								value={props.input.minStats}
								focus={focusedRule}
								onChange={(event) => props.onChange(props.index, event)}
								onFocus={(event) => handleFormFocus(event)}
								onBlur={() => setFocusedRule("")}
							/>
							<Rule
								label={"Power"}
								type={"number"}
								min={0}
								max={1000}
								name={"minRating"}
								index={props.index}
								value={props.input.minRating}
								focus={focusedRule}
								onChange={(event) => props.onChange(props.index, event)}
								onFocus={(event) => handleFormFocus(event)}
								onBlur={() => setFocusedRule("")}
							/>
						</SplitRuleWrapper>
					</>
				)}
			</div>
		</>
	)
}
