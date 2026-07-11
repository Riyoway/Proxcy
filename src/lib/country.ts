import * as countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

// Register locale for code lookups (Name -> Code)
countries.registerLocale(en);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function sanitizeCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeCountryName(value: string | null | undefined): string | null {
  if (!value) return null;

  const sanitizedInput = sanitizeCountryName(value);
  if (!sanitizedInput) return null;

  const upperValue = sanitizedInput.toUpperCase();
  let alpha2: string | undefined;

  // 1. Direct ISO Code Check (IL, USA, 376...)
  if (upperValue.length === 2 && countries.isValid(upperValue)) {
    alpha2 = upperValue;
  } else if (upperValue.length === 3) {
    alpha2 = countries.alpha3ToAlpha2(upperValue);
  } else if (/^\d+$/.test(upperValue)) {
    alpha2 = countries.numericToAlpha2(upperValue);
  }

  // 2. Name lookup if not found as code (e.g. "israel" -> "IL")
  if (!alpha2) {
    alpha2 = countries.getAlpha2Code(value, "en") || countries.getAlpha2Code(sanitizedInput, "en") || undefined;
  }

  // 3. Resolve to standard name using built-in Intl API
  if (alpha2) {
    try {
      const name = regionNames.of(alpha2);
      if (name) return name;
    } catch {
      // Fallback to library name if Intl fails
      const official = countries.getName(alpha2, "en", { select: "official" }) || countries.getName(alpha2, "en");
      if (official) return official;
    }
  }

  // 4. Ultimate fallback: Title Case
  return sanitizedInput.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
