export type HostedTokenVerifierStatus = 'active' | 'disabled';
export type HostedTokenVerifierType = 'jwks' | 'public_key' | 'hmac_legacy';

export interface HostedTokenVerifierConfig {
  id: string;
  type: HostedTokenVerifierType;
  issuer: string;
  audience: string;
  jwksUrl?: string;
  publicKeyPem?: string;
  keyId?: string;
  secretRef?: string;
  maxTtlSeconds: number;
  status: HostedTokenVerifierStatus;
  isDefault: boolean;
}

export interface HostedVerifierRow {
  id: string;
  verifier_type: HostedTokenVerifierType;
  issuer: string;
  audience: string;
  jwks_url: string | null;
  public_key_pem: string | null;
  key_id: string | null;
  secret_ref: string | null;
  max_ttl_seconds: number;
  status: HostedTokenVerifierStatus;
  is_default: number;
}

export function mapTokenVerifier(row: HostedVerifierRow): HostedTokenVerifierConfig {
  return {
    id: row.id,
    type: row.verifier_type,
    issuer: row.issuer,
    audience: row.audience,
    jwksUrl: row.jwks_url ?? undefined,
    publicKeyPem: row.public_key_pem ?? undefined,
    keyId: row.key_id ?? undefined,
    secretRef: row.secret_ref ?? undefined,
    maxTtlSeconds: row.max_ttl_seconds,
    status: row.status,
    isDefault: row.is_default === 1,
  };
}
