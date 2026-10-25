import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../lib/cn";

interface CarouselProps {
  readonly label: string
  readonly children: readonly ReactNode[]
  readonly initialPage?: number
  readonly className?: string
  readonly controlsClassName?: string
  readonly indicatorClassName?: string
}

export function Carousel ({ label, children, initialPage = 0, className, controlsClassName, indicatorClassName }: CarouselProps) {
  const viewportId = useId()
  const viewport = useRef<HTMLDivElement>(null)
  const geometry = useRef({ pageWidth: 0, maximum: 0 })
  const initialized = useRef(false)
  const activePage = useRef(initialPage)
  const [position, setPosition] = useState({ page: initialPage, count: children.length })

  const measure = useCallback(() => {
    const element = viewport.current
    const first = element?.firstElementChild
    if (!element || !(first instanceof HTMLElement) || !element.clientWidth) return

    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0
    const itemWidth = first.getBoundingClientRect().width + gap
    const count = children.length
    const maximum = Math.max(0, element.scrollWidth - element.clientWidth)
    const pageWidth = itemWidth
    if (!initialized.current || geometry.current.pageWidth !== pageWidth) {
      element.scrollLeft = Math.min(maximum, Math.min(count - 1, activePage.current) * pageWidth)
      initialized.current = true
    }
    const page = maximum > 0 && element.scrollLeft >= maximum - 1
      ? count - 1
      : Math.min(count - 1, Math.max(0, Math.round(element.scrollLeft / pageWidth)))

    geometry.current = { pageWidth, maximum }
    activePage.current = page
    setPosition(previous => previous.page === page && previous.count === count ? previous : { page, count })
  }, [children.length])

  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => { observer.disconnect() }
  }, [measure])

  function goTo (page: number) {
    const next = Math.max(0, Math.min(position.count - 1, page))
    viewport.current?.scrollTo({
      left: Math.min(geometry.current.maximum, next * geometry.current.pageWidth),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    })
  }

  function navigateByKeyboard (event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const next = event.key === "ArrowRight" ? position.page + 1
      : event.key === "ArrowLeft" ? position.page - 1
        : event.key === "Home" ? 0
          : event.key === "End" ? position.count - 1 : null
    if (next === null) return
    event.preventDefault()
    goTo(next)
  }

  return (
    <section aria-label={label} aria-roledescription="carrossel" className={cn("min-w-0", className)}>
      <div
        ref={viewport}
        id={viewportId}
        role="group"
        aria-label="Navegar pelos itens"
        tabIndex={0}
        onScroll={measure}
        onKeyDown={navigateByKeyboard}
        className="flex min-w-0 snap-x snap-mandatory gap-6.5 overflow-x-auto overscroll-x-contain rounded-artwork [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={(index + 1).toString() + " de " + children.length.toString()}
            aria-hidden={position.page !== index}
            inert={position.page !== index}
            className="min-w-0 shrink-0 basis-full snap-start"
          >
            {child}
          </div>
        ))}
      </div>

      {children.length > 1 && (
        <div className={cn("mt-8 flex h-3 justify-center gap-2", controlsClassName)}>
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={"Ir para a página " + (index + 1).toString() + ": " + label}
              aria-controls={viewportId}
              aria-current={position.page === index ? "true" : undefined}
              onClick={() => { goTo(index) }}
              className={cn(
                "relative size-3 shrink-0 cursor-pointer rounded-full border border-primary bg-transparent after:absolute after:-inset-x-1 after:-inset-y-4 aria-[current=true]:bg-primary",
                indicatorClassName,
              )}
            />
          ))}
        </div>
      )}
      <p aria-live="polite" aria-atomic="true" className="sr-only">Página {position.page + 1} de {position.count}</p>
    </section>
  )
}
