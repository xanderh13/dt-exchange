import { afterEach, describe, expect, test, vi } from "vitest"
import { AtomaRequestError, createFetcher, createSessionFetcher, safeJsonParse } from "./utils"
import type { User } from "./types"

let userNames = [
	`【パンツ】Pantsu#1234`,
	`🎃 ASH  П (◣_◢) П  🎃#1234`,
	`七曜曜#1234`,
	`Dunesca ʕ•͡ᴥ•ʔ#1234`,
	`Deadsiesthe•̪̀●́#1234`,
	`F̶̍̋I̶̔̀Q#1234`,
]

for (let user of userNames) {
	test(`safeUserParse can parse special user names: ${user}`, () => {
		const TestAccessToken = "This Should Be Returned"
		let userString = JSON.stringify({
			AccessToken: TestAccessToken,
			AccountName: user,
		})
		let decoded = safeJsonParse<User>(userString)
		expect(decoded).not.toBe(undefined)
		expect(decoded!.AccessToken).toBe(TestAccessToken)
		expect(decoded?.AccountName).not.toBe(undefined)
		expect(decoded?.AccountName).not.toBe("")
		expect(/[\w-#]+/.test(decoded!.AccessToken)).toBe(true)
	})
}

test(" safely removes bad usernames anywhere in json", () => {
	const TestAccessToken = "This Should Be Returned"
	for (let user of userNames) {
		let objs = [
			{ AccountName: user },
			{ AccessToken: TestAccessToken, AccountName: user },
			{ AccountName: user, AccessToken: TestAccessToken },
			{
				RefreshToken: TestAccessToken,
				AccountName: user,
				AccessToken: TestAccessToken,
			},
		]
		for (let obj of objs) {
			let decoded = safeJsonParse<User>(JSON.stringify(obj))
			expect(decoded).not.toBe(undefined)
			expect(decoded?.AccountName).not.toBe(undefined)
			expect(decoded?.AccountName).not.toBe("")
			expect(/[\w-#]+/.test(decoded!.AccessToken)).toBe(true)
		}
	}
})

const session = (accessToken: string): User => ({
	AccessToken: accessToken,
	RefreshToken: "refresh-token",
	ExpiresIn: 1_800,
	Sub: "account-id",
	AccountName: "Reject",
	RefreshAt: 0,
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("Atoma fetching", () => {
	test("reads the latest session for every request", async () => {
		let user = session("old-token")
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		)
		vi.stubGlobal("fetch", fetchMock)
		const fetcher = createSessionFetcher(() => user)

		await fetcher("/first")
		user = session("refreshed-token")
		await fetcher("/second")

		expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
			authorization: "Bearer old-token",
		})
		expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
			authorization: "Bearer refreshed-token",
		})
	})

	test("retries an authorization failure when Atoma refreshed the session in flight", async () => {
		let user = session("old-token")
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(async () => {
				user = session("refreshed-token")
				return new Response(null, { status: 401, statusText: "Unauthorized" })
			})
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ recovered: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			)
		vi.stubGlobal("fetch", fetchMock)

		await expect(createSessionFetcher(() => user)("/storefront")).resolves.toEqual({
			recovered: true,
		})
		expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
			authorization: "Bearer refreshed-token",
		})
	})

	test("throws HTTP failures so SWR can retain data and retry", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 503, statusText: "Unavailable" })),
		)

		await expect(createFetcher(session("token"))("/storefront")).rejects.toEqual(
			expect.objectContaining<Partial<AtomaRequestError>>({
				name: "AtomaRequestError",
				status: 503,
			}),
		)
	})
})
