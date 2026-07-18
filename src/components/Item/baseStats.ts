import type { BaseStat } from "../../types"

const MAX_TOTAL_STATS = 380
const MAX_STAT_VALUE = 80

/**
 * Reproduce Darktide's weapon-potential calculation. The API sends the current
 * base stats plus the progress of each stat through the round-robin empowerment
 * cycle; it does not send a separate max-stats array.
 */
export function calculateMaxBaseStats(
	baseStats: readonly BaseStat[],
	expertiseStatIncreases: readonly BaseStat[] = [],
): BaseStat[] {
	const stats = baseStats.map((stat) => ({
		name: stat.name,
		value: stat.value * 100,
	}))
	const currentTotal = Math.floor(stats.reduce((total, stat) => total + stat.value, 0) + 0.5)
	let remainingBudget = Math.max(MAX_TOTAL_STATS - currentTotal, 0)
	let eligibleIndices = stats.flatMap((stat, index) =>
		Math.floor(stat.value + 0.5) < MAX_STAT_VALUE ? [index] : [],
	)
	let roundIndices = eligibleIndices

	if (expertiseStatIncreases.length > 0) {
		const increasesByName = new Map(
			expertiseStatIncreases.map((increase) => [increase.name, increase.value]),
		)
		const eligibleIncreases = eligibleIndices.flatMap((index) => {
			const increase = increasesByName.get(stats[index]!.name)
			return increase === undefined ? [] : [increase]
		})

		if (eligibleIncreases.length > 0) {
			const minimumIncrease = Math.min(...eligibleIncreases)
			const minimumIndices = eligibleIndices.filter(
				(index) => increasesByName.get(stats[index]!.name) === minimumIncrease,
			)

			if (minimumIndices.length > 0) {
				roundIndices = minimumIndices
			}
		}
	}

	while (remainingBudget > 0 && eligibleIndices.length > 0) {
		let madeProgress = false

		for (const index of roundIndices) {
			const stat = stats[index]!

			if (Math.floor(stat.value + 0.5) < MAX_STAT_VALUE) {
				stat.value += 1
				remainingBudget -= 1
				madeProgress = true
			}

			if (remainingBudget <= 0) break
		}

		if (!madeProgress) break

		eligibleIndices = eligibleIndices.filter(
			(index) => Math.floor(stats[index]!.value + 0.5) < MAX_STAT_VALUE,
		)
		roundIndices = eligibleIndices
	}

	return stats.map((stat) => ({
		name: stat.name,
		value: Math.min(Math.floor(stat.value + 0.5), MAX_STAT_VALUE) / 100,
	}))
}

/** Return the lone 60% stat from an exact 80/80/80/80/60 distribution. */
export function findDumpStat(maxStats: readonly BaseStat[]): BaseStat | undefined {
	if (maxStats.length !== 5) return

	const dumpStats = maxStats.filter((stat) => Math.round(stat.value * 100) === 60)
	const maxedStats = maxStats.filter((stat) => Math.round(stat.value * 100) === 80)

	return dumpStats.length === 1 && maxedStats.length === 4 ? dumpStats[0] : undefined
}

/** Match a dump-stat filter using the same case-insensitive partial-name behavior as other filters. */
export function matchesDumpStatName(dumpStatName: string, filters: readonly string[]): boolean {
	const normalizedName = dumpStatName.toLowerCase()

	return filters.some((filter) => {
		const normalizedFilter = filter.trim().toLowerCase()
		return (
			normalizedFilter === "any" ||
			(!!normalizedFilter && normalizedName.includes(normalizedFilter))
		)
	})
}
