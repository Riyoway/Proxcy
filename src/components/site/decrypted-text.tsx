"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface DecryptedTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  charset?: string;
  animateOnLoad?: boolean;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

export function DecryptedText({
  text,
  className,
  speed = 30,
  delay = 0,
  charset = DEFAULT_CHARSET,
  animateOnLoad = true,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [hasAnimated, setHasAnimated] = useState(false);

  const animate = useCallback(() => {
    const textArray = text.split("");
    const totalIterations = text.length * 3;
    let iteration = 0;

    const interval = setInterval(() => {
      setDisplayText(
        textArray
          .map((char, index) => {
            // Preserve spaces and special characters
            if (char === " " || /[^a-zA-Z0-9]/.test(char)) {
              return char;
            }
            // Reveal characters progressively
            if (index < iteration / 3) {
              return textArray[index];
            }
            // Show random character
            return charset[Math.floor(Math.random() * charset.length)];
          })
          .join("")
      );

      iteration++;
      if (iteration >= totalIterations) {
        clearInterval(interval);
        setDisplayText(text);
        setHasAnimated(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, charset]);

  useEffect(() => {
    if (!animateOnLoad || hasAnimated) {
      setDisplayText(text);
      return;
    }

    const timeout = setTimeout(() => {
      animate();
    }, delay);

    return () => clearTimeout(timeout);
  }, [animate, animateOnLoad, delay, hasAnimated, text]);

  return (
    <span className={cn("font-mono", className)} aria-label={text}>
      {displayText}
    </span>
  );
}
