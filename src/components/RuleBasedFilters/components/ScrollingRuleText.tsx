import { useEffect, useRef } from "react"
import { RuleText } from "./RuleText"

export function ScrollingRuleText({ text }: { text: string }) {
	const ref = useRef<HTMLDivElement>(null)
	const pausedUntil = useRef(0)
	useEffect(() => {
		const element = ref.current
		if (!element) return
		let direction = 1
		let position = 0
		let previousTime = performance.now()
		const reset = () => {
			element.scrollLeft = 0
			position = 0
			direction = 1
			previousTime = performance.now()
			pausedUntil.current = previousTime + 2500
		}
		reset()
		const resizeObserver = new ResizeObserver(reset)
		resizeObserver.observe(element)
		if (element.firstElementChild) resizeObserver.observe(element.firstElementChild)
		const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
		const timer = window.setInterval(() => {
			const now = performance.now()
			const elapsed = Math.min(now - previousTime, 100)
			previousTime = now
			if (motion.matches || document.hidden || now < pausedUntil.current) return
			const max = element.scrollWidth - element.clientWidth
			if (max <= 0) return
			// Keep fractional progress ourselves so browser pixel rounding cannot stall movement.
			position = Math.max(0, Math.min(max, position + direction * elapsed * 0.02))
			element.scrollLeft = position
			if (position >= max || position <= 0) {
				direction *= -1
				pausedUntil.current = now + 2500
			}
		}, 50)
		const manualScroll = () => {
			if (performance.now() < pausedUntil.current) position = element.scrollLeft
		}
		element.addEventListener("scroll", manualScroll, { passive: true })
		return () => {
			window.clearInterval(timer)
			resizeObserver.disconnect()
			element.removeEventListener("scroll", manualScroll)
		}
	}, [text])
	const pause = () => {
		pausedUntil.current = performance.now() + 8000
	}
	return (
		<div
			ref={ref}
			className="scrolling-rule-text"
			tabIndex={0}
			aria-label={text}
			onPointerDown={pause}
			onFocus={pause}
			onTouchStart={pause}
			onTouchMove={pause}
			onWheel={pause}
		>
			<RuleText size="small">{text}</RuleText>
		</div>
	)
}
