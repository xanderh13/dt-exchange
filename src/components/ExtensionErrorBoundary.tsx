import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = {
	children: ReactNode
}

type State = {
	error?: Error
}

export class ExtensionErrorBoundary extends Component<Props, State> {
	override state: State = {}

	static getDerivedStateFromError(error: Error): State {
		return { error }
	}

	override componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Armoury Exchange rendering failed", error, info)
	}

	override render() {
		if (!this.state.error) return this.props.children

		return (
			<div style={{ padding: "1rem 0" }}>
				<div className="MuiTypography-root MuiTypography-h2 css-15sy8fq">Armoury Exchange</div>
				<p>The extension encountered an error while rendering this account.</p>
				<pre style={{ whiteSpace: "pre-wrap", color: "#ff8a80" }}>
					{this.state.error.message || String(this.state.error)}
				</pre>
				<p>Copy the first red error from Chrome DevTools Console when reporting this issue.</p>
				<button type="button" onClick={() => window.location.reload()}>
					Reload dashboard
				</button>
			</div>
		)
	}
}
