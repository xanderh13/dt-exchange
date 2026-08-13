import type { User } from "./types"

export class AtomaRequestError extends Error {
	constructor(
		readonly status: number,
		readonly statusText: string,
		readonly url: string,
	) {
		super(`Atoma request failed (${status}${statusText ? ` ${statusText}` : ""})`)
		this.name = "AtomaRequestError"
	}
}

export function createFetcher(user: User) {
	return async function fetchApi<T>(path: string): Promise<T> {
		let url = path.startsWith("https") ? path : `https://bsp-td-prod.atoma.cloud${path}`

		if (url.includes(":sub")) {
			url = url.replace(":sub", user.Sub)
		}

		let res = await fetch(url, {
			headers: {
				authorization: `Bearer ${user.AccessToken}`,
			},
		})

		if (!res.ok) {
			throw new AtomaRequestError(res.status, res.statusText, url)
		}

		try {
			return (await res.clone().json()) as T
		} catch {
			return (await res.text()) as T
		}
	}
}

/**
 * Create a stable fetcher that resolves Atoma's current session for every request.
 *
 * The dashboard replaces `localStorage.user` when it refreshes an access token. Holding onto the
 * User object from React's first render therefore guarantees that a long-lived extension mount
 * will eventually send an expired token.
 */
export function createSessionFetcher(getUser: () => User | undefined = getFatSharkUser) {
	return async function fetchWithCurrentSession<T>(path: string): Promise<T> {
		const user = getUser()
		if (!user) throw new Error("User Auth not found...")

		try {
			return await createFetcher(user)<T>(path)
		} catch (error) {
			// Atoma may finish refreshing the website session while an old-token request is in flight.
			// Retry once only when the session actually changed; SWR handles later transient retries.
			if (error instanceof AtomaRequestError && (error.status === 401 || error.status === 403)) {
				const refreshedUser = getUser()
				if (
					refreshedUser &&
					(refreshedUser.AccessToken !== user.AccessToken || refreshedUser.Sub !== user.Sub)
				) {
					return createFetcher(refreshedUser)<T>(path)
				}
			}

			throw error
		}
	}
}

export function safeJsonParse<T>(input: string): T | undefined {
	try {
		return JSON.parse(input)
	} catch (error) {
		return undefined
	}
}

export function getFatSharkUser(): User | undefined {
	// This key is set by FatShark, so it's not in our namespace.
	let user = localStorage.getItem("user")

	if (!user) {
		warn("No user present in localstorage")
		return undefined
	}

	return safeJsonParse<User>(user)
}

export function log(text: string, color = "black") {
	const style = `color: ${color}; font-weight: bold;`
	console.info("%c" + text, style)
}

export function warn(msg: string) {
	console.warn("++", msg, "++")
}

export function camelToSentence(str: string): string {
	let parts = str.split(/(?=[A-Z])/)
	return parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(" ")
}

export function capitalize(str: string): string {
	return str
		.toLowerCase()
		.split(" ")
		.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
		.join(" ")
}
