import { useMemo, useState } from "react"
import type { Character, StoreType } from "../../types"
import {
	collectPurchaseDiagnostics,
	runPurchaseRoutingProbes,
	runPurchaseSchemaProbes,
	type PurchaseDiagnosticReport,
} from "../../services/purchaseDiagnostics"
import { collectAuthFlowDiagnostics } from "../../services/authDiagnostics"
import "./PurchaseDiagnostics.css"

type Props = {
	character: Character
	storeType: StoreType
	linkedAccountPlatforms: string[]
}

export function PurchaseDiagnostics({ character, storeType, linkedAccountPlatforms }: Props) {
	const [report, setReport] = useState<PurchaseDiagnosticReport>()
	const [busy, setBusy] = useState<"collect" | "schema" | "routing" | "auth">()
	const [message, setMessage] = useState<string>()
	const reportText = useMemo(() => (report ? JSON.stringify(report, null, 2) : ""), [report])

	async function collect() {
		setBusy("collect")
		setMessage(undefined)
		try {
			setReport(await collectPurchaseDiagnostics(character, storeType, linkedAccountPlatforms))
			setMessage("Sanitized read-only diagnostics collected.")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : String(error))
		} finally {
			setBusy(undefined)
		}
	}

	async function probe() {
		setBusy("schema")
		setMessage(undefined)
		try {
			setReport(await runPurchaseSchemaProbes(character, storeType, linkedAccountPlatforms))
			setMessage("Schema probes completed. No usable purchase identifiers were sent.")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : String(error))
		} finally {
			setBusy(undefined)
		}
	}

	async function probeRouting() {
		setBusy("routing")
		setMessage(undefined)
		try {
			setReport(await runPurchaseRoutingProbes(character, storeType, linkedAccountPlatforms))
			setMessage("Routing probes completed. Every offer identifier was nonexistent.")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : String(error))
		} finally {
			setBusy(undefined)
		}
	}

	async function analyzeAuth() {
		setBusy("auth")
		setMessage(undefined)
		try {
			setReport(await collectAuthFlowDiagnostics())
			setMessage("Website authentication flow analyzed without sending any tokens.")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : String(error))
		} finally {
			setBusy(undefined)
		}
	}

	async function copyReport() {
		try {
			await navigator.clipboard.writeText(reportText)
			setMessage("Sanitized report copied to the clipboard.")
		} catch {
			setMessage("The browser blocked clipboard access. Select and copy the report manually.")
		}
	}

	return (
		<details className="purchase-diagnostics">
			<summary>PlayStation Purchase Diagnostics</summary>
			<div className="purchase-diagnostics-content">
				<p>
					This panel never displays or copies your tokens. Auth analysis downloads only the public
					dashboard script with credentials omitted and inspects non-secret session metadata.
					Collection performs three API GET requests. Schema and routing probes use missing,
					invalid, or nonexistent identifiers, so none can identify a valid purchase.
				</p>
				<div className="purchase-diagnostics-actions">
					<button type="button" onClick={analyzeAuth} disabled={busy !== undefined}>
						{busy === "auth" ? "Analyzing…" : "Analyze website auth flow"}
					</button>
					<button type="button" onClick={collect} disabled={busy !== undefined}>
						{busy === "collect" ? "Collecting…" : "Collect diagnostics"}
					</button>
					<button type="button" onClick={probe} disabled={!report || busy !== undefined}>
						{busy === "schema" ? "Probing…" : "Run safe schema probes"}
					</button>
					<button type="button" onClick={probeRouting} disabled={!report || busy !== undefined}>
						{busy === "routing" ? "Probing…" : "Run safe routing probes"}
					</button>
					<button type="button" onClick={copyReport} disabled={!report || busy !== undefined}>
						Copy sanitized report
					</button>
				</div>
				{message ? <p className="purchase-diagnostics-message">{message}</p> : null}
				{reportText ? (
					<textarea
						aria-label="Sanitized purchase diagnostic report"
						readOnly
						spellCheck={false}
						value={reportText}
					/>
				) : null}
			</div>
		</details>
	)
}
