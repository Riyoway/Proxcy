"use client";

import { cn } from "@/lib/utils";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 600,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const directionStyles = {
    up: "translate-y-8",
    down: "-translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8",
    fade: "",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all will-change-transform",
        directionStyles[direction],
        isVisible
          ? "translate-x-0 translate-y-0 opacity-100"
          : "opacity-0",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 100,
}: StaggerContainerProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <div
            key={index}
            className={cn(
              "transition-all duration-500 will-change-transform",
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-6 opacity-0"
            )}
            style={{ transitionDelay: `${index * staggerDelay}ms` }}
          >
            {child}
          </div>
        ))
      ) : (
        children
      )}
    </div>
  );
}
