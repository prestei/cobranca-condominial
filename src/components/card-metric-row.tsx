"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const AUTOPLAY_MS = 5000;
const DESKTOP_MQ = "(min-width: 768px)";

type CardMetricRowProps = {
  children: ReactNode;
  "aria-label"?: string;
  className?: string;
  desktopCols?: 2 | 3 | 4;
};

const desktopGridClass: Record<2 | 3 | 4, string> = {
  2: "min-[768px]:grid-cols-2",
  3: "min-[768px]:grid-cols-3",
  4: "min-[768px]:grid-cols-4",
};

export function CardMetricRow({
  children,
  "aria-label": ariaLabel = "Indicadores",
  className,
  desktopCols = 3,
}: CardMetricRowProps) {
  const items = Children.toArray(children);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselAtivo, setCarouselAtivo] = useState(false);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const slide = slideRefs.current[index];
    slide?.scrollIntoView({ behavior, inline: "start", block: "nearest" });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_MQ);
    const update = () => setCarouselAtivo(!desktop.matches);
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!carouselAtivo || items.length <= 1) return;

    const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;

    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visivel = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visivel) return;
        const index = slides.indexOf(visivel.target as HTMLDivElement);
        if (index >= 0) setActiveIndex(index);
      },
      { root, threshold: 0.55 },
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [carouselAtivo, items.length]);

  useEffect(() => {
    if (!carouselAtivo || items.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      const next = (activeIndex + 1) % items.length;
      scrollToIndex(next);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [activeIndex, carouselAtivo, items.length, scrollToIndex]);

  return (
    <section aria-label={ariaLabel} className={className}>
      <div
        ref={scrollRef}
        className={[
          "-mx-md flex gap-md overflow-x-auto overscroll-x-contain px-md pb-px snap-x snap-mandatory",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "min-[768px]:mx-0 min-[768px]:grid min-[768px]:gap-md min-[768px]:overflow-visible min-[768px]:px-0 min-[768px]:pb-0",
          desktopGridClass[desktopCols],
        ].join(" ")}
      >
        {items.map((child, index) => (
          <div
            key={index}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            className="min-w-full shrink-0 snap-start min-[768px]:min-w-0"
          >
            {child}
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <div
          className="mt-sm flex justify-center gap-xs min-[768px]:hidden"
          role="tablist"
          aria-label="Posição dos indicadores"
        >
          {items.map((_, index) => {
            const ativo = index === activeIndex;
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={ativo}
                aria-label={`Indicador ${index + 1} de ${items.length}`}
                className={[
                  "size-2 rounded-full transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
                  ativo ? "bg-primary-container" : "bg-border-subtle",
                ].join(" ")}
                onClick={() => scrollToIndex(index)}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
