/**
 * SafeFreight OS — Versioned REST API Type Definitions
 * Reference: PRD v4.0.0 §8 & PROJECT.md
 */

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginationMeta {
  limit: number;
  cursor?: string | null;
  next_cursor?: string | null;
  has_more: boolean;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiErrorResponse {
  error: string;
  statusCode?: number;
  details?: unknown;
}

export interface IdempotencyRecord {
  key: string;
  tenant_id: string;
  endpoint: string;
  status_code: number;
  response_body: unknown;
  created_at: string;
  expires_at: string;
}
