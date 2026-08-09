import { useState } from "react"
import { Button } from "./Button"
import { archetype } from "../icons"
import { Loading } from "./Loading"
import { Store, SORT_OPTIONS, SORT_LABELS, FILTER_OPTIONS, FilterOption } from "./Store"
import { Text } from "./Text"
import { Title } from "./Title"
import { useAccount } from "../hooks/useAccount"
import type { SortOption } from "./Store"
import type { StoreType, FilterRule } from "../types"
import "./Layout.css"
import { CLASS_LABELS, STORE_OPTIONS, STORE_LABELS } from "../types"
import { RuleBasedFilters } from "./RuleBasedFilters/RuleBasedFilters"
import { useLocalStorage } from "../hooks/useLocalStorage"
import { SplitRuleWrapper } from "./RuleBasedFilters/components/SplitRuleWrapper"
import { Rule } from "./RuleBasedFilters/components/Rule"
import { deemphasizeClass, DeemphasizeOption } from "./Item/Item"

const isString = (value: unknown): value is string => typeof value === "string"
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean"
const isFilterRules = (value: unknown): value is FilterRule[] => Array.isArray(value)
const isOption = <T extends string>(options: readonly T[]) =>
	function (value: unknown): value is T {
		return typeof value === "string" && options.includes(value as T)
	}

export function Layout() {
	let account = useAccount()
	let [activeChar, setActiveChar] = useLocalStorage<string>("active-char", "", isString)
	let [sortOption, setSortOption] = useLocalStorage<SortOption>(
		"sort-option",
		SORT_OPTIONS[0]!,
		isOption(SORT_OPTIONS),
	)
	let [rbfOption, setRBFOption] = useLocalStorage<FilterRule[]>(
		"filter-rules",
		[{ minStats: 360 }],
		isFilterRules,
	)
	let [filterOption, setFilterOption] = useLocalStorage<FilterOption>(
		"filter-option",
		FILTER_OPTIONS[0]!,
		isOption(FILTER_OPTIONS),
	)
	let [storeType, setStoreType] = useLocalStorage<StoreType>(
		"store-type",
		"credits",
		isOption(STORE_OPTIONS),
	)
	let [enableRuleBasedFiltering, setEnableRuleBasedFiltering] = useLocalStorage(
		"enable-rule-based-filter",
		false,
		isBoolean,
	)
	let [deemphasizeOption, setDeemphasizeOption] = useLocalStorage<DeemphasizeOption>(
		"deemphasize-selection",
		"none",
		isOption(Object.keys(deemphasizeClass) as DeemphasizeOption[]),
	)

	let [focusedInput, setFocusedInput] = useState<string>("")

	if (!account) {
		return (
			<>
				<Title>Armoury Exchange</Title>
				<Loading />
			</>
		)
	}

	if (account.characters[0] && !activeChar) {
		setActiveChar(account.characters[0].id)
	}

	if (
		activeChar &&
		account.characters.length &&
		!account.characters.find((char) => char.id === activeChar)
	) {
		const charId = account?.characters[0]?.id
		if (charId) {
			setActiveChar(charId)
		}
	}

	const character = account.characters.find((char) => char.id === activeChar)

	if (!character) {
		return (
			<>
				<Title>Armoury Exchange</Title>
				<p>You don't have any characters!</p>
			</>
		)
	}

	return (
		<>
			<Title>Armoury Exchange</Title>
			<ul className="char-list">
				{account.characters.map((character) => {
					const characterIcon = archetype[character.archetype as keyof typeof archetype]
					return (
						<li key={character.id}>
							<Button
								active={activeChar === character.id}
								onClick={() => {
									setActiveChar(character.id)
								}}
								icon={
									characterIcon ? <img src={characterIcon} className="class-icon" /> : undefined
								}
							>
								<div
									style={{
										lineHeight: "1em",
										display: "flex",
										flexDirection: "column",
										alignItems: "flex-start",
										margin: "1em 0",
									}}
								>
									<div>{character.name}</div>
									<div
										style={{
											textTransform: "capitalize",
										}}
									>
										{CLASS_LABELS[character.archetype] ?? character.archetype} {character.level}
									</div>
								</div>
							</Button>
						</li>
					)
				})}
			</ul>
			<br />
			<SplitRuleWrapper columns={3}>
				<Rule
					label={"Store Type"}
					type={"select"}
					name={"store_type"}
					value={storeType}
					focus={focusedInput}
					dataValues={STORE_OPTIONS}
					labels={STORE_LABELS}
					onChange={function (event) {
						setStoreType(event.target.value as StoreType)
					}}
					onFocus={(event) => setFocusedInput(event.target.id)}
					onBlur={() => setFocusedInput("")}
				/>
				<Rule
					label={"Filter By"}
					type={"select"}
					name={"filter_by"}
					value={filterOption}
					focus={focusedInput}
					dataValues={FILTER_OPTIONS}
					onChange={function (event) {
						setFilterOption(event.target.value as FilterOption)
					}}
					onFocus={(event) => setFocusedInput(event.target.id)}
					onBlur={() => setFocusedInput("")}
				/>
				<Rule
					label={"Sort By"}
					type={"select"}
					name={"sort_by"}
					value={sortOption}
					focus={focusedInput}
					dataValues={SORT_OPTIONS}
					labels={SORT_LABELS}
					onChange={function (event) {
						setSortOption(event.target.value as SortOption)
					}}
					onFocus={(event) => setFocusedInput(event.target.id)}
					onBlur={() => setFocusedInput("")}
				/>
			</SplitRuleWrapper>
			<div className="sort-row">
				<label htmlFor="enable-rule-based-filter">
					<Text>Enable rule based filtering: </Text>
				</label>
				<input
					type="checkbox"
					id="enable-rule-based-filter"
					checked={enableRuleBasedFiltering}
					onChange={(event) => {
						setEnableRuleBasedFiltering(event.target.checked)
					}}
				/>
			</div>

			{enableRuleBasedFiltering ? (
				<div className="rbf-row">
					<RuleBasedFilters
						state={rbfOption}
						setState={setRBFOption}
						DE={deemphasizeOption}
						setDE={setDeemphasizeOption}
					/>
				</div>
			) : null}

			<Store
				character={character}
				storeType={storeType}
				sortOption={sortOption}
				filterOption={filterOption}
				enableRuleBasedFilterOption={enableRuleBasedFiltering}
				filterRules={rbfOption}
				deemphasizeOption={deemphasizeOption}
			/>
		</>
	)
}
