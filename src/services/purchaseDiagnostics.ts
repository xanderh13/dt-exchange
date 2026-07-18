import type { Character, Store, StoreType, User } from "../types"

const API_ROOT = "https://bsp-td-prod.atoma.cloud"

type JsonRecord = Record<string, unknown>

type Wallet = {
	balance: {
		amount: number
		type: string
	}
	lastTransactionId?: number
	owner?: string
}

type WalletSource = "account" | "character"

type CapturedResponse = {
	path: string
	requestId: string
	status?: number
	statusText?: string
	ok: boolean
	headers: Record<string, string>
	body?: unknown
	networkError?: string
}

type DiagnosticContext = {
	user: User
	character: Character
	storeType: StoreType
	accountWalletsResponse: CapturedResponse
	characterWalletsResponse: CapturedResponse
	storefrontResponse: CapturedResponse
	accountWallets: Wallet[]
	characterWallets: Wallet[]
	store?: Store
	offer?: Store["personal"][number]
	selectedWallet?: Wallet
	selectedWalletSource?: WalletSource
	walletOwner: string
	redactions: Map<string, string>
}

export type PurchaseDiagnosticReport = JsonRecord

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseResponseBody(text: string): unknown {
	if (!text) return undefined

	try {
		return JSON.parse(text) as unknown
	} catch {
		return text
	}
}

function requestId(): string {
	return typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function captureRequest(
	user: User,
	path: string,
	init: RequestInit = {},
): Promise<CapturedResponse> {
	const id = requestId()

	try {
		const response = await fetch(`${API_ROOT}${path}`, {
			...init,
			headers: {
				...init.headers,
				authorization: `Bearer ${user.AccessToken}`,
				"request-id": id,
			},
		})
		const text = await response.text()
		const responseHeaders: Record<string, string> = {}
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value
		})

		return {
			path,
			requestId: id,
			status: response.status,
			statusText: response.statusText,
			ok: response.ok,
			headers: responseHeaders,
			body: parseResponseBody(text),
		}
	} catch (error) {
		return {
			path,
			requestId: id,
			ok: false,
			headers: {},
			networkError: error instanceof Error ? error.message : String(error),
		}
	}
}

function readWallets(body: unknown): Wallet[] {
	if (!isRecord(body) || !Array.isArray(body["wallets"])) return []

	return body["wallets"].flatMap((candidate) => {
		if (!isRecord(candidate) || !isRecord(candidate["balance"])) return []

		const amount = candidate["balance"]["amount"]
		const type = candidate["balance"]["type"]
		if (typeof amount !== "number" || typeof type !== "string") return []

		return [
			{
				balance: { amount, type },
				lastTransactionId:
					typeof candidate["lastTransactionId"] === "number"
						? candidate["lastTransactionId"]
						: undefined,
				owner: typeof candidate["owner"] === "string" ? candidate["owner"] : undefined,
			},
		]
	})
}

function readStore(body: unknown): Store | undefined {
	if (!isRecord(body) || !isRecord(body["catalog"]) || !Array.isArray(body["personal"])) {
		return undefined
	}

	return body as unknown as Store
}

function decodeJwtClaims(token: string): JsonRecord | undefined {
	const payload = token.split(".")[1]
	if (!payload) return undefined

	try {
		const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
		const decoded = JSON.parse(atob(padded)) as unknown
		return isRecord(decoded) ? decoded : undefined
	} catch {
		return undefined
	}
}

function safeClaimValue(value: unknown): unknown {
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null
	) {
		return value
	}

	if (Array.isArray(value)) {
		return value.filter(
			(item): item is string | number | boolean | null =>
				typeof item === "string" ||
				typeof item === "number" ||
				typeof item === "boolean" ||
				item === null,
		)
	}
	if (isRecord(value)) {
		return { objectKeys: Object.keys(value).sort() }
	}

	return "<complex-value-omitted>"
}

export function summarizeToken(token: string): JsonRecord {
	const claims = decodeJwtClaims(token)
	if (!claims) {
		return { format: "opaque-or-unreadable" }
	}

	const allowedClaims = [
		"iss",
		"aud",
		"scope",
		"scp",
		"client_id",
		"token_use",
		"platform",
		"auth_method",
		"issuedFor",
		"roles",
		"iat",
		"nbf",
		"exp",
	]
	const safeClaims = Object.fromEntries(
		allowedClaims.flatMap((name) =>
			Object.prototype.hasOwnProperty.call(claims, name)
				? [[name, safeClaimValue(claims[name])]]
				: [],
		),
	)
	const expiration =
		typeof claims["exp"] === "number"
			? new Date(claims["exp"] * 1000).toISOString()
			: null

	return {
		format: "jwt",
		claimNames: Object.keys(claims).sort(),
		safeClaims,
		expiration,
	}
}

function addRedaction(map: Map<string, string>, value: string | undefined, alias: string): void {
	if (value) map.set(value, alias)
}

function redactString(value: string, redactions: ReadonlyMap<string, string>): string {
	let redacted = value
	const ordered = [...redactions.entries()].sort(([left], [right]) => right.length - left.length)

	for (const [secret, alias] of ordered) {
		redacted = redacted.replaceAll(secret, alias)
	}

	return redacted
}

/** Recursively sanitize data before it can enter a displayed or copied diagnostic report. */
export function sanitizeDiagnosticValue(
	value: unknown,
	redactions: ReadonlyMap<string, string>,
): unknown {
	if (typeof value === "string") return redactString(value, redactions)
	if (Array.isArray(value)) {
		return value.map((item) => sanitizeDiagnosticValue(item, redactions))
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => {
				if (/^(authorization|cookie|set-cookie|accessToken|refreshToken)$/i.test(key)) {
					return [key, "<redacted>"]
				}
				return [key, sanitizeDiagnosticValue(item, redactions)]
			}),
		)
	}

	return value
}

function ownerAlias(owner: string | undefined, context: DiagnosticContext): string {
	if (!owner) return "<missing>"
	if (owner === context.user.Sub) return "<account>"
	if (owner === context.character.id) return "<character>"
	return "<other-owner>"
}

function walletSummary(wallet: Wallet, source: WalletSource, context: DiagnosticContext): JsonRecord {
	return {
		source,
		currency: wallet.balance.type,
		balance: wallet.balance.amount,
		lastTransactionId: wallet.lastTransactionId ?? null,
		owner: ownerAlias(wallet.owner, context),
	}
}

function responseSummary(response: CapturedResponse, context: DiagnosticContext): JsonRecord {
	const summary: JsonRecord = {
		path: redactString(response.path, context.redactions),
		requestId: response.requestId,
		status: response.status ?? null,
		statusText: response.statusText ?? null,
		ok: response.ok,
		headers: sanitizeDiagnosticValue(response.headers, context.redactions),
	}

	if (!response.ok && response.body !== undefined) {
		summary["body"] = sanitizeDiagnosticValue(response.body, context.redactions)
	}
	if (response.networkError) {
		summary["networkError"] = redactString(response.networkError, context.redactions)
	}

	return summary
}

function chooseWallet(
	accountWallets: readonly Wallet[],
	characterWallets: readonly Wallet[],
	currency: string | undefined,
): { wallet?: Wallet; source?: WalletSource } {
	if (!currency) return {}

	const accountWallet = accountWallets.find((wallet) => wallet.balance.type === currency)
	if (accountWallet) return { wallet: accountWallet, source: "account" }

	const characterWallet = characterWallets.find((wallet) => wallet.balance.type === currency)
	return characterWallet
		? { wallet: characterWallet, source: "character" }
		: {}
}

async function loadContext(character: Character, storeType: StoreType): Promise<DiagnosticContext> {
	const userJson = localStorage.getItem("user")
	if (!userJson) throw new Error("Fatshark login data was not found in local storage.")

	const parsedUser = JSON.parse(userJson) as unknown
	if (
		!isRecord(parsedUser) ||
		typeof parsedUser["AccessToken"] !== "string" ||
		typeof parsedUser["Sub"] !== "string"
	) {
		throw new Error("Fatshark login data did not have the expected token and account fields.")
	}
	const user = parsedUser as unknown as User

	const accountWalletPath = `/data/${user.Sub}/account/wallets`
	const characterWalletPath = `/data/${user.Sub}/characters/${character.id}/wallets`
	const storefrontPath = `/store/storefront/${storeType}_store_${character.archetype}?accountId=${user.Sub}&personal=true&characterId=${character.id}`
	const [accountWalletsResponse, characterWalletsResponse, storefrontResponse] = await Promise.all([
		captureRequest(user, accountWalletPath),
		captureRequest(user, characterWalletPath),
		captureRequest(user, storefrontPath),
	])
	const accountWallets = readWallets(accountWalletsResponse.body)
	const characterWallets = readWallets(characterWalletsResponse.body)
	const store = readStore(storefrontResponse.body)
	const offer = store?.personal.find((candidate) => candidate.state === "active") ?? store?.personal[0]
	const selected = chooseWallet(
		accountWallets,
		characterWallets,
		offer?.price.amount.type ?? storeType,
	)
	const walletOwner = selected.wallet?.owner ?? character.id
	const redactions = new Map<string, string>()

	addRedaction(redactions, user.AccessToken, "<access-token>")
	addRedaction(redactions, user.RefreshToken, "<refresh-token>")
	addRedaction(redactions, user.AccountName, "<account-name>")
	addRedaction(redactions, user.Sub, "<account>")
	addRedaction(redactions, character.id, "<character>")
	addRedaction(redactions, store?.catalog.id, "<catalog>")
	addRedaction(redactions, offer?.offerId, "<offer>")
	addRedaction(redactions, offer?.sku.id, "<sku>")
	for (const wallet of [...accountWallets, ...characterWallets]) {
		if (wallet.owner !== user.Sub && wallet.owner !== character.id) {
			addRedaction(redactions, wallet.owner, "<other-owner>")
		}
	}

	return {
		user,
		character,
		storeType,
		accountWalletsResponse,
		characterWalletsResponse,
		storefrontResponse,
		accountWallets,
		characterWallets,
		store,
		offer,
		selectedWallet: selected.wallet,
		selectedWalletSource: selected.source,
		walletOwner,
		redactions,
	}
}

function buildReport(
	context: DiagnosticContext,
	linkedAccountPlatforms: readonly string[],
): PurchaseDiagnosticReport {
	const selectedWallet = context.selectedWallet
	const offer = context.offer
	const store = context.store
	const proposedBody = offer && store
		? {
				storeName: store.name,
				catalogId: "<catalog>",
				offerId: "<offer>",
				characterId: "<character>",
				latestTransactionId: selectedWallet?.lastTransactionId ?? null,
			}
		: null

	return {
		generatedAt: new Date().toISOString(),
		safety: {
			purchaseAttempted: false,
			requestsMade: ["GET account wallets", "GET character wallets", "GET storefront"],
			identifiersAndTokensRedacted: true,
		},
		authentication: {
			account: "<account>",
			linkedAccountPlatforms: [...linkedAccountPlatforms].sort(),
			token: sanitizeDiagnosticValue(
				summarizeToken(context.user.AccessToken),
				context.redactions,
			),
		},
		selection: {
			character: "<character>",
			archetype: context.character.archetype,
			storeType: context.storeType,
		},
		responses: {
			accountWallets: responseSummary(context.accountWalletsResponse, context),
			characterWallets: responseSummary(context.characterWalletsResponse, context),
			storefront: responseSummary(context.storefrontResponse, context),
		},
		walletAnalysis: {
			accountWallets: context.accountWallets.map((wallet) =>
				walletSummary(wallet, "account", context),
			),
			characterWallets: context.characterWallets.map((wallet) =>
				walletSummary(wallet, "character", context),
			),
			selected: selectedWallet && context.selectedWalletSource
				? walletSummary(selectedWallet, context.selectedWalletSource, context)
				: null,
		},
		storefront: store
			? {
					name: store.name,
					catalogId: "<catalog>",
					personalOfferCount: store.personal.length,
					activeOfferCount: store.personal.filter((candidate) => candidate.state === "active").length,
					currentRotationEnd: store.currentRotationEnd,
					sampleOffer: offer
						? {
								offerId: "<offer>",
								skuId: "<sku>",
								state: offer.state,
								currency: offer.price.amount.type,
								price: offer.price.amount.amount,
							}
						: null,
				}
			: null,
		currentGameRequestBlueprint: proposedBody
			? {
					method: "POST",
					path: `/store/<account>/wallets/${ownerAlias(context.walletOwner, context)}/purchases`,
					body: proposedBody,
				}
			: null,
	}
}

export async function collectPurchaseDiagnostics(
	character: Character,
	storeType: StoreType,
	linkedAccountPlatforms: readonly string[],
): Promise<PurchaseDiagnosticReport> {
	const context = await loadContext(character, storeType)
	return buildReport(context, linkedAccountPlatforms)
}

function interpretProbeStatus(status: number | undefined): string {
	if (status === 400 || status === 422) {
		return "The request reached application validation; inspect the response body to distinguish schema, catalog, offer, and wallet checks."
	}
	if (status === 401 || status === 403) {
		return "The request was rejected before useful schema validation, pointing to authentication scope, permissions, or required client headers."
	}
	if (status === 404) {
		return "The candidate wallet-owner path was not found; compare account and character wallet owners."
	}
	if (status === undefined) {
		return "The browser could not complete the request; inspect the network error and extension console."
	}
	return "Unexpected status; inspect the sanitized response body and headers."
}

export async function runPurchaseSchemaProbes(
	character: Character,
	storeType: StoreType,
	linkedAccountPlatforms: readonly string[],
): Promise<PurchaseDiagnosticReport> {
	const context = await loadContext(character, storeType)
	const path = `/store/${context.user.Sub}/wallets/${context.walletOwner}/purchases`
	const missingFieldsBody = { diagnosticProbe: true }
	const wrongTypesBody = {
		catalogId: false,
		storeName: false,
		offerId: false,
		priceId: false,
		characterId: false,
		latestTransactionId: "diagnostic-not-a-number",
		lastTransactionId: "diagnostic-not-a-number",
		ownedSkus: false,
	}
	const [missingFieldsProbe, wrongTypesProbe] = await Promise.all([
		captureRequest(context.user, path, {
			method: "POST",
			body: JSON.stringify(missingFieldsBody),
			headers: { "Content-Type": "application/json" },
		}),
		captureRequest(context.user, path, {
			method: "POST",
			body: JSON.stringify(wrongTypesBody),
			headers: { "Content-Type": "application/json" },
		}),
	])
	const report = buildReport(context, linkedAccountPlatforms)

	return {
		...report,
			safety: {
			purchaseAttempted: false,
			requestsMade: [
				"GET account wallets",
				"GET character wallets",
				"GET storefront",
				"POST missing-fields body without catalog, offer, character, price, or transaction identifiers",
				"POST wrong-types body containing no usable identifiers",
			],
			identifiersAndTokensRedacted: true,
			probeBodiesCannotDescribeAPurchase: true,
		},
		schemaProbes: {
			missingFields: {
				request: {
					method: "POST",
					path: redactString(path, context.redactions),
					headersSent: ["Authorization", "Content-Type", "request-id"],
					body: missingFieldsBody,
				},
				response: responseSummary(missingFieldsProbe, context),
				interpretation: interpretProbeStatus(missingFieldsProbe.status),
			},
			wrongTypes: {
				request: {
					method: "POST",
					path: redactString(path, context.redactions),
					headersSent: ["Authorization", "Content-Type", "request-id"],
					body: wrongTypesBody,
				},
				response: responseSummary(wrongTypesProbe, context),
				interpretation: interpretProbeStatus(wrongTypesProbe.status),
			},
		},
	}
}

const NONEXISTENT_UUID = "00000000-0000-0000-0000-000000000000"

export async function runPurchaseRoutingProbes(
	character: Character,
	storeType: StoreType,
	linkedAccountPlatforms: readonly string[],
): Promise<PurchaseDiagnosticReport> {
	const context = await loadContext(character, storeType)
	const characterPath = `/store/${context.user.Sub}/wallets/${context.character.id}/purchases`
	const accountPath = `/store/${context.user.Sub}/wallets/${context.user.Sub}/purchases`
	const fakeCatalogBody = {
		catalogId: NONEXISTENT_UUID,
		storeName: context.store?.name ?? `${storeType}_store_${character.archetype}`,
	}
	const fakeOfferBody = {
		catalogId: context.store?.catalog.id ?? NONEXISTENT_UUID,
		storeName: context.store?.name ?? `${storeType}_store_${character.archetype}`,
		offerId: NONEXISTENT_UUID,
		characterId: context.character.id,
	}
	const post = (path: string, body: JsonRecord) =>
		captureRequest(context.user, path, {
			method: "POST",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
		})
	const characterFakeCatalog = await post(characterPath, fakeCatalogBody)
	const accountFakeCatalog = await post(accountPath, fakeCatalogBody)
	const characterFakeOffer = await post(characterPath, fakeOfferBody)
	const accountFakeOffer = await post(accountPath, fakeOfferBody)
	const report = buildReport(context, linkedAccountPlatforms)
	const requestSummary = (path: string, body: JsonRecord) => ({
		method: "POST",
		path: redactString(path, context.redactions),
		headersSent: ["Authorization", "Content-Type", "request-id"],
		body: sanitizeDiagnosticValue(body, context.redactions),
	})
	const probeSummary = (path: string, body: JsonRecord, response: CapturedResponse) => ({
		request: requestSummary(path, body),
		response: responseSummary(response, context),
		interpretation: interpretProbeStatus(response.status),
	})

	return {
		...report,
		safety: {
			purchaseAttempted: false,
			requestsMade: [
				"GET account wallets",
				"GET character wallets",
				"GET storefront",
				"POST nonexistent catalog to character wallet path",
				"POST nonexistent catalog to account wallet path",
				"POST real catalog with nonexistent offer to character wallet path",
				"POST real catalog with nonexistent offer to account wallet path",
			],
			identifiersAndTokensRedacted: true,
			probeBodiesCannotDescribeAValidPurchase: true,
			nonexistentUuid: NONEXISTENT_UUID,
		},
		routingProbes: {
			characterWalletPath: {
				nonexistentCatalog: probeSummary(
					characterPath,
					fakeCatalogBody,
					characterFakeCatalog,
				),
				realCatalogNonexistentOffer: probeSummary(
					characterPath,
					fakeOfferBody,
					characterFakeOffer,
				),
			},
			accountWalletPath: {
				nonexistentCatalog: probeSummary(accountPath, fakeCatalogBody, accountFakeCatalog),
				realCatalogNonexistentOffer: probeSummary(
					accountPath,
					fakeOfferBody,
					accountFakeOffer,
				),
			},
		},
	}
}
