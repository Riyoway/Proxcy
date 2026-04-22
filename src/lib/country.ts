const COUNTRY_NAME_ALIASES: Record<string, string> = {
  // United States
  "united states of america": "united states",
  "usa": "united states",
  "us": "united states",
  // Russia
  "russian federation": "russia",
  "ru": "russia",
  // United Kingdom
  "great britain": "united kingdom",
  "uk": "united kingdom",
  "gb": "united kingdom",
  // South Korea
  "korea republic of": "south korea",
  "republic of korea": "south korea",
  "kr": "south korea",
  // North Korea
  "democratic peoples republic of korea": "north korea",
  "korea democratic peoples republic of": "north korea",
  // China & Taiwan & Hong Kong
  "peoples republic of china": "china",
  "cn": "china",
  "taiwan province of china": "taiwan",
  "tw": "taiwan",
  "hong kong sar": "hong kong",
  "hk": "hong kong",
  // Vietnam
  "viet nam": "vietnam",
  "vn": "vietnam",
  // Iran
  "iran islamic republic of": "iran",
  "ir": "iran",
  // Other standard aliases
  "bolivia plurinational state of": "bolivia",
  "czech republic": "czechia",
  "lao peoples democratic republic": "laos",
  "moldova republic of": "moldova",
  "palestine state of": "palestine",
  "syrian arab republic": "syria",
  "tanzania united republic of": "tanzania",
  "venezuela bolivarian republic of": "venezuela",
  "br": "brazil",
  "de": "germany",
  "jp": "japan",
  "fr": "france",
  "it": "italy",
  "in": "india",
  "ca": "canada",
  "au": "australia",
  "id":"indonesia"
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
