"use client";

import { useCountUp } from "@/hooks/use-count-up";

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
  format?: boolean;
}

export function CountUp({
  end,
  start = 0,
  duration = 1500,
  delay = 0,
  decimals = 0,
  className,
  format = true,
}: CountUpProps) {
  const count = useCountUp({ start, end, duration, delay, decimals });

  const displayValue = format ? count.toLocaleString() : count.toString();

  return <span className={className}>{displayValue}</span>;
}
