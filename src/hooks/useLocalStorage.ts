import { useCallback, useState } from "react"

// The original extension stores preferences in the Atoma page's localStorage. Content scripts from
// every Armoury Exchange build therefore shared the same keys and could give an older build values
// it did not understand. Keep this fork's preferences isolated while importing existing settings
// once so current users do not lose their configuration.
const NAMESPACE = "xanderh13-dt-exchange-"
const LEGACY_NAMESPACE = "armoury-exchange-"

const makeKey = (key: string) => `${NAMESPACE}${key}`
const makeLegacyKey = (key: string) => `${LEGACY_NAMESPACE}${key}`

function parseStoredValue<T>(value: string | null): T | undefined {
	if (value == null) return

	try {
		return JSON.parse(value) as T
	} catch (error) {
		console.warn("Armoury Exchange ignored an invalid stored preference", error)
		return
	}
}

function migrateLegacyValue<T>(key: string): T | undefined {
	const legacyValue = parseStoredValue<T>(localStorage.getItem(makeLegacyKey(key)))
	if (legacyValue == null) return

	// Very old releases called curios "trinkets". Normalize the imported copy without rewriting the
	// legacy key that another installed version may still own.
	const migratedValue = (
		key === "filter-option" && legacyValue === "trinket" ? "curio" : legacyValue
	) as T
	localStorage.setItem(makeKey(key), JSON.stringify(migratedValue))
	return migratedValue
}

function setLocalStorage(key: string, value: unknown) {
	localStorage.setItem(makeKey(key), JSON.stringify(value))
}

function getLocalStorage<T>(key: string, isValid?: (value: unknown) => value is T): T | undefined {
	const value = parseStoredValue<T>(localStorage.getItem(makeKey(key)))
	const storedValue = value ?? migrateLegacyValue<T>(key)
	if (storedValue != null && isValid && !isValid(storedValue)) {
		console.warn(`Armoury Exchange ignored an unsupported ${key} preference`, storedValue)
		return
	}
	return storedValue
}

export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
	isValid?: (value: unknown) => value is T,
): [T, (newValue: T) => void] {
	let [state, _setState] = useState<T>(() => getLocalStorage<T>(key, isValid) ?? defaultValue)

	let setState = useCallback(
		(value: T) => {
			setLocalStorage(key, value)
			_setState(value)
		},
		[key, _setState],
	)

	return [state, setState]
}
