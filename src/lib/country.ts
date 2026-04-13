const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "bolivia plurinational state of": "bolivia",
  "czech republic": "czechia",
  "democratic peoples republic of korea": "north korea",
  "iran islamic republic of": "iran",
  "korea democratic peoples republic of": "north korea",
  "korea republic of": "south korea",
  "lao peoples democratic republic": "laos",
  "moldova republic of": "moldova",
  "palestine state of": "palestine",
  "republic of korea": "south korea",
  "russian federation": "russia",
  "syrian arab republic": "syria",
  "taiwan province of china": "taiwan",
  "tanzania united republic of": "tanzania",
  "united states of america": "united states",
  "venezuela bolivarian republic of": "venezuela",
  "viet nam": "vietnam",
};

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
  if (!value) {
    return null;
  }

  const sanitized = sanitizeCountryName(value);

  if (!sanitized) {
    return null;
  }

  return COUNTRY_NAME_ALIASES[sanitized] ?? sanitized;
}
