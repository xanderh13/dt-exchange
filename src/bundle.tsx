import { createRoot, type Root } from "react-dom/client"
import { App } from "./components/App"
import { ExtensionErrorBoundary } from "./components/ExtensionErrorBoundary"
import { log } from "./utils"
import "./ExtensionPanel.css"

const EXTENSION_ROOT_ATTRIBUTE = "data-armoury-exchange-root"
const EXTENSION_MOUNT_ATTRIBUTE = "data-armoury-exchange-mount"
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

function findDashboardSectionStack() {
	const main = document.querySelector("main")
	if (!main) return

	// Atoma's page shell renders its route inside a Material UI Container. The dashboard then uses
	// an outer row Stack (sidebar + content) and an inner column Stack containing the page sections.
	// Stable MUI component classes let us target that layout without depending on section names,
	// generated style hashes, or the number/order of dashboard panels.
	const pageContainer = Array.from(main.children).find((element) =>
		element.classList.contains("MuiContainer-root"),
	)
	const dashboardRow = pageContainer
		? Array.from(pageContainer.children).find((element) =>
				element.classList.contains("MuiStack-root"),
			)
		: undefined
	const sectionStack = dashboardRow
		? Array.from(dashboardRow.children).find((element) =>
				element.classList.contains("MuiStack-root"),
			)
		: undefined

	return sectionStack as HTMLElement | undefined
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

function mountApp(sectionStack: HTMLElement) {
	const container = document.createElement("section")
	container.setAttribute(EXTENSION_ROOT_ATTRIBUTE, "")
	container.className = "armoury-exchange-panel"
	container.setAttribute("aria-label", EXTENSION_TITLE)

	const mountPoint = document.createElement("div")
	mountPoint.setAttribute(EXTENSION_MOUNT_ATTRIBUTE, "")
	const ownershipMarker = document.createElement("div")
	ownershipMarker.hidden = true
	ownershipMarker.textContent = EXTENSION_TITLE
	container.append(ownershipMarker, mountPoint)
	sectionStack.prepend(container)

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

	const sectionStack = findDashboardSectionStack()
	if (sectionStack) mountApp(sectionStack)
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

if (window.top === window) {
	startMountManager()
}
