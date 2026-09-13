import type { CuviqErrorCode, CuviqErrorDetail, CuviqSource } from "./types.js";

export class CuviqError extends Error {
  readonly code: CuviqErrorCode;
  readonly source: CuviqSource | undefined;

  constructor(code: CuviqErrorCode, message: string, source?: CuviqSource) {
    super(message);
    this.name = "CuviqError";
    this.code = code;
    this.source = source;
  }

  toDetail(): CuviqErrorDetail {
    return this.source === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, source: this.source };
  }
}

export function normalizeLoadError(error: unknown, source: CuviqSource): CuviqError {
  if (error instanceof CuviqError) return error;

  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();
  if (/draco|ktx2|basis|meshopt|decoder/.test(message)) {
    return new CuviqError("DECODER_REQUIRED", "This model requires a decoder that CuViq V1 does not include.", source);
  }
  if (/404|not found|failed to load resource|missing/.test(message)) {
    return new CuviqError("RESOURCE_MISSING", "The model or one of its referenced resources could not be found.", source);
  }
  if (/cors|cross-origin|cross origin|access-control/.test(message)) {
    return new CuviqError("CORS_ERROR", "The model could not be loaded because its server does not allow cross-origin access.", source);
  }
  if (/failed to fetch|networkerror|network request failed|status of 0/.test(message)) {
    return new CuviqError("CORS_ERROR", "The model request was blocked by the network or cross-origin policy.", source);
  }
  return new CuviqError("LOAD_FAILED", "The model could not be loaded or parsed.", source);
}
