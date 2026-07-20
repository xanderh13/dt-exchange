import { describe, expect, test } from "vitest"
import { analyzeAuthBundle, sanitizeObservedUrl } from "./authDiagnostics"

describe("analyzeAuthBundle", () => {
	test("extracts the public PSN web flow without copying codes or tokens", () => {
		const source = `
			const auth = "PSNWeb " + secretCode;
			client.get("queue/join");
			client.get("queue/check");
			const refreshToken = "refresh-secret-value";
			const refresh = authApi","Bearer " + refreshToken;
			client.get("queue/refresh");
			const url = "https://ca.account.sony.com/api/authz/v3/oauth/authorize";
			const request = { scope:"psn:s2s openid id_token:psn.basic_claims" };
			const config = { authorizationHeader:"PSNWeb ".concat(code) };
		`

		const analysis = analyzeAuthBundle(source)
		const serialized = JSON.stringify(analysis)

		expect(analysis["detected"]).toMatchObject({
			queuePaths: ["queue/join", "queue/check", "queue/refresh"],
			webAuthorizationSchemes: ["PSNWeb"],
			sonyAuthorizeEndpoint: "https://ca.account.sony.com/api/authz/v3/oauth/authorize",
			sonyRequestedScope: "psn:s2s openid id_token:psn.basic_claims",
		})
		expect(serialized).not.toContain("secretCode")
		expect(serialized).not.toContain("refresh-secret-value")
	})
})

describe("sanitizeObservedUrl", () => {
	test("removes query strings, fragments, and known account identifiers", () => {
		expect(
			sanitizeObservedUrl(
				"https://bsp-td-prod.atoma.cloud/web/account-private/summary?token=secret#code",
				"account-private",
			),
		).toBe("https://bsp-td-prod.atoma.cloud/web/<account>/summary")
	})

	test("excludes unrelated origins", () => {
		expect(sanitizeObservedUrl("https://example.com/private?token=secret")).toBeUndefined()
	})
})
