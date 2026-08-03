import { createRoot, type Root } from "react-dom/client"
import { App } from "./components/App"
import { ExtensionErrorBoundary } from "./components/ExtensionErrorBoundary"
import { log } from "./utils"

const EXTENSION_ROOT_ATTRIBUTE = "data-armoury-exchange-root"
const EXTENSION_MOUNT_ATTRIBUTE = "data-armoury-exchange-mount"
const ACCOUNT_DETAILS_TITLE = "Account Details"
const EXTENSION_TITLE = "Armoury Exchange"

type MountedApp = {
	container: HTMLElement
	mountPoint: HTMLElement
	root: Root
}

let mountedApp: MountedApp | undefined
let reconcileScheduled = false

function hasExactText(element: Element, text: string) {
	return element.textContent?.trim() === text
}

function findExactText(text: string) {
	const candidates = document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, div")
	return Array.from(candidates).find(
		(element) => element.childElementCount === 0 && hasExactText(element, text),
	) as HTMLElement | undefined
}

function getPanelContent(panel: HTMLElement) {
	const firstChild = panel.firstElementChild as HTMLElement | null
	const secondChild = firstChild?.firstElementChild as HTMLElement | null
	return secondChild ?? firstChild ?? panel
}

function findAccountDetailsPanel() {
	const title = findExactText(ACCOUNT_DETAILS_TITLE)
	if (!title) return

	// Prefer the current Atoma panel class, but select the panel semantically instead of by index.
	const currentPanel = Array.from(
		document.querySelectorAll<HTMLElement>(".MuiBox-root.css-10kv6m9"),
	).find((panel) => panel.contains(title))
	if (currentPanel) return currentPanel

	// Material UI class hashes change. Fall back to the nearest box whose two-level content wrapper
	// contains the Account Details heading; this mirrors the structure used by the original injector.
	let ancestor = title.parentElement
	while (ancestor) {
		if (
			ancestor.classList.contains("MuiBox-root") &&
			getPanelContent(ancestor).contains(title) &&
			ancestor.parentElement
		) {
			return ancestor
		}
		ancestor = ancestor.parentElement
	}

	return undefined
}

function isDashboardHome() {
	return window.location.pathname.replace(/\/+$/, "") === "/dashboard"
}

function cleanUpMountedApp() {
	if (!mountedApp) return

	try {
		mountedApp.root.unmount()
	} catch (error) {
		console.warn("Armoury Exchange could not cleanly unmount", error)
	}

	if (mountedApp.container.isConnected) {
		mountedApp.container.remove()
	}
	mountedApp = undefined
}

function mountApp(accountDetailsPanel: HTMLElement) {
	const parent = accountDetailsPanel.parentElement
	if (!parent) return

	const container = accountDetailsPanel.cloneNode(true) as HTMLElement
	container.setAttribute(EXTENSION_ROOT_ATTRIBUTE, "")

	// Cloning host markup can duplicate IDs, which makes labels and selectors ambiguous.
	for (const element of [
		container,
		...Array.from(container.querySelectorAll<HTMLElement>("[id]")),
	]) {
		element.removeAttribute("id")
	}

	const content = getPanelContent(container)
	const mountPoint = document.createElement("div")
	mountPoint.setAttribute(EXTENSION_MOUNT_ATTRIBUTE, "")
	const ownershipMarker = document.createElement("div")
	ownershipMarker.hidden = true
	ownershipMarker.textContent = EXTENSION_TITLE
	mountPoint.append(ownershipMarker)
	content.replaceChildren(mountPoint)
	parent.insertBefore(container, accountDetailsPanel)

	try {
		const root = createRoot(mountPoint)
		mountedApp = { container, mountPoint, root }
		root.render(
			<ExtensionErrorBoundary>
				<App />
			</ExtensionErrorBoundary>,
		)

		log(
			`> EXECUTION COMPLETE
+++ ARMOURY EXCHANGE: POSSESSED +++
+++ GLORY TO THE FRACTURED OMNISSIAH +++`,
			"green",
		)
	} catch (error) {
		container.remove()
		mountedApp = undefined
		console.error("Armoury Exchange failed to mount", error)
	}
}

function reconcileMount() {
	reconcileScheduled = false

	if (
		mountedApp &&
		(!mountedApp.container.isConnected || !mountedApp.mountPoint.isConnected || !isDashboardHome())
	) {
		cleanUpMountedApp()
	}

	if (!isDashboardHome() || mountedApp) return

	// Another copy of this fork may already own the page. Do not create competing React roots.
	if (document.querySelector(`[${EXTENSION_ROOT_ATTRIBUTE}]`)) return

	// Preserve compatibility with the Web Store build, which predates the stable root marker.
	if (findExactText(EXTENSION_TITLE)) return

	const accountDetailsPanel = findAccountDetailsPanel()
	if (accountDetailsPanel) mountApp(accountDetailsPanel)
}

function scheduleReconcile() {
	if (reconcileScheduled) return
	reconcileScheduled = true
	requestAnimationFrame(reconcileMount)
}

function startMountManager() {
	log("+++ INTRUSION LOG: MOURNINGSTAR // SECTOR: ARMOURY_EXCHANGE +++  ", "red")

	const observer = new MutationObserver(scheduleReconcile)
	observer.observe(document, { subtree: true, childList: true })

	window.addEventListener("pageshow", scheduleReconcile)
	window.addEventListener("popstate", scheduleReconcile)
	document.addEventListener("visibilitychange", scheduleReconcile)
	scheduleReconcile()
}

function runMigrations() {
	// @ts-expect-error: JSON.parse can accept null but types don't think it can
	if (JSON.parse(localStorage.getItem("armoury-exchange-filter-option")) === "trinket") {
		localStorage.setItem("armoury-exchange-filter-option", JSON.stringify("curio"))
	}
}

if (window.top === window) {
	runMigrations()
	startMountManager()
}
