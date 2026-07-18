import { describe, expect, test } from "vitest"
import { sanitizeDiagnosticValue, summarizeToken } from "./purchaseDiagnostics"

function jwt(payload: Record<string, unknown>): string {
	const encode = (value: object) =>
		btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

	return `${encode({ alg: "none" })}.${encode(payload)}.`
}

describe("summarizeToken", () => {
	test("keeps useful permission claims but excludes account identifiers and token IDs", () => {
		const summary = summarizeToken(
			jwt({
				sub: "private-account-id",
				jti: "private-token-id",
				iss: "fatshark",
				aud: "darktide",
				scope: "store.read",
				platform: "psn",
				issuedFor: { platform: "psn", platformId: "private-platform-id" },
				roles: ["player"],
				exp: 2_000_000_000,
			}),
		)

		expect(summary["safeClaims"]).toEqual({
			iss: "fatshark",
			aud: "darktide",
			scope: "store.read",
			platform: "psn",
			issuedFor: { objectKeys: ["platform", "platformId"] },
			roles: ["player"],
			exp: 2_000_000_000,
		})
		expect(JSON.stringify(summary)).not.toContain("private-account-id")
		expect(JSON.stringify(summary)).not.toContain("private-token-id")
		expect(JSON.stringify(summary)).not.toContain("private-platform-id")
		expect(summary["claimNames"]).toEqual(
			expect.arrayContaining(["aud", "exp", "iss", "jti", "platform", "scope", "sub"]),
		)
	})

	test("reports opaque tokens without echoing them", () => {
		const summary = summarizeToken("very-secret-opaque-token")

		expect(summary).toEqual({ format: "opaque-or-unreadable" })
		expect(JSON.stringify(summary)).not.toContain("very-secret-opaque-token")
	})
})

describe("sanitizeDiagnosticValue", () => {
	test("redacts identifiers, tokens, cookies, and nested response text", () => {
		const redactions = new Map([
			["account-123", "<account>"],
			["offer-456", "<offer>"],
		])
		const sanitized = sanitizeDiagnosticValue(
			{
				authorization: "Bearer secret",
				AccessToken: "secret",
				path: "/store/account-123/offers/offer-456",
				nested: ["account-123", { message: "Offer offer-456 was rejected" }],
				"set-cookie": "session=secret",
			},
			redactions,
		)

		expect(sanitized).toEqual({
			authorization: "<redacted>",
			AccessToken: "<redacted>",
			path: "/store/<account>/offers/<offer>",
			nested: ["<account>", { message: "Offer <offer> was rejected" }],
			"set-cookie": "<redacted>",
		})
	})
})
