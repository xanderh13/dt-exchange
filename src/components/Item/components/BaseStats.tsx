import localisation from "../../../localisation"
import { rating } from "../../../icons"
import "./BaseStats.css"
import { Text } from "../../Text"
import type { Personal } from "../../../types"
import { calculateMaxBaseStats } from "../baseStats"

type Props = {
	offer: Personal
}
export function BaseStats({ offer }: Props) {
	const overrides = offer.description.overrides
	const baseStats = overrides.base_stats ?? []
	const maxStats = calculateMaxBaseStats(baseStats, overrides.expertise_stat_increases)
	const maxStatsByName = new Map(maxStats.map((stat) => [stat.name, stat.value]))
	const currentTotal = Math.floor(
		baseStats.reduce((total, stat) => total + stat.value * 100, 0) + 0.5,
	)
	const maxTotal = maxStats.reduce((total, stat) => total + Math.round(stat.value * 100), 0)

	return (
		<div className="row">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<span>Modifiers (Current / Max)</span>
				<div
					style={{
						display: "flex",
						alignItems: "center",
					}}
				>
					<img
						src={rating}
						style={{
							height: "1em",
						}}
					/>
					{currentTotal} / {maxTotal}
				</div>
			</div>
			<div className="stats">
				{baseStats.map((stat) => {
					const currentValue = Math.round(stat.value * 100)
					const maxValue = Math.round((maxStatsByName.get(stat.name) ?? stat.value) * 100)

					return (
						<div className="stat" key={stat.name}>
							<Text>{localisation[stat.name].display_name}</Text>
							<div className="stat-bar-row">
								<span className="stat-p">
									<span className="stat-p-current">{currentValue}</span>
									<span className="stat-p-separator">/</span>
									<span className="stat-p-max">{maxValue}%</span>
								</span>
								<div className="stat-bar-outer">
									<div
										className="stat-bar-potential"
										style={{
											width: `${maxValue}%`,
										}}
									/>
									<div
										className="stat-bar-inner"
										style={{
											width: `${currentValue}%`,
										}}
									/>
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
