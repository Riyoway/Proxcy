export type GeoStatus = "resolved" | "unavailable";

export interface GeoMetadata {
  country_code: string | null;
  country_name: string | null;
  asn: string | null;
  organization: string | null;
  geo_status: GeoStatus;
}

export interface ProxyRecord extends GeoMetadata {
  id: string;
  ip: string;
  port: number;
  protocol: string;
  speed_ms: number;
  is_valid: boolean;
  is_google: boolean;
  checked_at: string;
}
