import { summarizeToken } from "./purchaseDiagnostics"

type JsonRecord = Record<string, unknown>

const AUTH_API_ROOT = "https://bsp-auth-prod.atoma.cloud"
const RECOGNIZED_STORAGE_KEYS = ["user", "linking"] as const
const AUTH_MARKERS = {
	queuePaths: ["queue/join", "queue/check", "queue/refresh"],
	webAuthorizationSchemes: ["PSNWeb", "SteamWeb", "XboxWeb"],
} as const

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function firstMatch(source: string, pattern: RegExp): string | undefined {
	return pattern.exec(source)?.[1]
}

function sha256(value: string): Promise<string> {
	return crypto.subtle
		.digest("SHA-256", new TextEncoder().encode(value))
		.then((digest) =>
			[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
		)
}

function valueType(value: unknown): string {
	if (value === null) return "null"
	if (Array.isArray(value)) return "array"
	return typeof value
}

function readSession(): JsonRecord {
	const raw = localStorage.getItem("user")
	if (!raw) return { present: false }

	try {
		const parsed = JSON.parse(raw) as unknown
		if (!isRecord(parsed)) return { present: true, format: "unexpected" }

		const accessToken = parsed["AccessToken"]
		const refreshToken = parsed["RefreshToken"]
		return {
			present: true,
			fieldNames: Object.keys(parsed).sort(),
			fieldTypes: Object.fromEntries(
				Object.entries(parsed).map(([key, value]) => [key, valueType(value)]),
			),
			accessToken:
				typeof accessToken === "string" ? summarizeToken(accessToken) : { present: false },
			refreshToken:
				typeof refreshToken === "string" ? summarizeToken(refreshToken) : { present: false },
		}
	} catch {
		return { present: true, format: "invalid-json" }
	}
}

/** Remove query strings, fragments, and account identifiers from observed resource URLs. */
export function sanitizeObservedUrl(input: string, accountId?: string): string | undefined {
	try {
		const base =
			typeof window === "undefined" ? "https://accounts.atoma.cloud" : window.location.origin
		const url = new URL(input, base)
		if (
			!url.hostname.endsWith(".atoma.cloud") &&
			url.hostname !== "atoma.cloud" &&
			url.hostname !== "ca.account.sony.com"
		) {
			return undefined
		}

		let pathname = url.pathname
		if (accountId) pathname = pathname.replaceAll(accountId, "<account>")
		pathname = pathname.replace(
			/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
			"<uuid>",
		)
		return `${url.origin}${pathname}`
	} catch {
		return undefined
	}
}

export function analyzeAuthBundle(source: string): JsonRecord {
	const queuePaths = AUTH_MARKERS.queuePaths.filter((path) => source.includes(`"${path}"`))
	const webAuthorizationSchemes = AUTH_MARKERS.webAuthorizationSchemes.filter((scheme) =>
		source.includes(`"${scheme} "`),
	)
	const sonyAuthorizeEndpoint = firstMatch(source, /(https:\/\/ca\.account\.sony\.com\/[^"']+)/)
	const sonyRequestedScope = firstMatch(source, /scope:"([^"]*psn:[^"]*)"/)
	const refreshUsesBearer = /authApi","Bearer "[\s\S]{0,300}queue\/refresh/.test(source)
	const psnCodeUsesPsnWeb = /authorizationHeader:"PSNWeb "[\s\S]{0,160}/.test(source)

	return {
		detected: {
			queuePaths,
			webAuthorizationSchemes,
			sonyAuthorizeEndpoint: sonyAuthorizeEndpoint ?? null,
			sonyRequestedScope: sonyRequestedScope ?? null,
			psnAuthorizationCodeTransport: psnCodeUsesPsnWeb
				? "Authorization: PSNWeb <Sony authorization code>"
				: "not detected",
			refreshTokenTransport: refreshUsesBearer
				? "Authorization: Bearer <refresh token>"
				: "not detected",
		},
		inferredFlow:
			queuePaths.length === AUTH_MARKERS.queuePaths.length && psnCodeUsesPsnWeb
				? [
						"Sony returns an authorization code to /linking.",
						`The website sends that code to ${AUTH_API_ROOT}/queue/join using the PSNWeb authorization scheme.`,
						"It polls queue/check with the returned queue ticket until Atoma issues access and refresh tokens.",
						"It later exchanges the refresh token at queue/refresh; no alternate Atoma role or scope is selected by the website bundle.",
					]
				: ["The bundle did not contain every marker expected by this analyzer."],
	}
}

function observedResources(accountId?: string): string[] {
	return [
		...new Set(
			performance
				.getEntriesByType("resource")
				.map((entry) => sanitizeObservedUrl(entry.name, accountId))
				.filter((url): url is string => Boolean(url)),
		),
	].sort()
}

function findDashboardBundle(): string | undefined {
	const scriptUrls = Array.from(document.scripts)
		.map((script) => script.src)
		.filter(Boolean)
		.filter((url) => {
			try {
				return new URL(url).origin === window.location.origin
			} catch {
				return false
			}
		})

	return (
		scriptUrls.find((url) => /\/static\/js\/main\.[^/]+\.js(?:$|\?)/.test(url)) ??
		scriptUrls.find((url) => url.endsWith(".js"))
	)
}

export async function collectAuthFlowDiagnostics(): Promise<JsonRecord> {
	const session = readSession()
	const rawUser = localStorage.getItem("user")
	let accountId: string | undefined
	if (rawUser) {
		try {
			const parsed = JSON.parse(rawUser) as unknown
			if (isRecord(parsed) && typeof parsed["Sub"] === "string") accountId = parsed["Sub"]
		} catch {
			// The session summary already reports malformed JSON.
		}
	}

	const bundleUrl = findDashboardBundle()
	let bundle: JsonRecord = { found: false }
	let networkRequestsMade: string[] = []

	if (bundleUrl) {
		const safeBundleUrl = sanitizeObservedUrl(bundleUrl, accountId) ?? "<same-origin-script>"
		networkRequestsMade = [`GET ${safeBundleUrl} (credentials omitted)`]
		try {
			const response = await fetch(bundleUrl, { credentials: "omit" })
			const source = await response.text()
			bundle = {
				found: true,
				url: safeBundleUrl,
				status: response.status,
				ok: response.ok,
				contentLength: source.length,
				sha256: await sha256(source),
				lastModified: response.headers.get("last-modified"),
				analysis: analyzeAuthBundle(source),
			}
		} catch (error) {
			bundle = {
				found: true,
				url: safeBundleUrl,
				networkError: error instanceof Error ? error.message : String(error),
			}
		}
	}

	return {
		generatedAt: new Date().toISOString(),
		safety: {
			authenticationAttempted: false,
			authApiCalled: false,
			tokensTransmittedByExtension: false,
			storageModified: false,
			networkRequestsMade,
		},
		page: {
			location: `${window.location.origin}${window.location.pathname}`,
			recognizedStorageKeysPresent: RECOGNIZED_STORAGE_KEYS.filter(
				(key) => localStorage.getItem(key) !== null,
			),
			observedAuthenticationResources: observedResources(accountId),
		},
		currentSession: session,
		publicDashboardBundle: bundle,
		interpretation: [
			"The public website uses a platform-specific web authorization scheme to obtain tokens from the Atoma auth queue.",
			"A refresh repeats the website token exchange; it does not request a different role or purchase permission.",
			"If the access token remains role web-player, the remaining permission difference is server-side token issuance versus the native game, not a hidden purchase-body field.",
		],
	}
}
