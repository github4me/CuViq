export type CuviqSource = string | File | Blob;

export type CuviqLoading = "lazy" | "eager";

export type CuviqViewerState =
  | "idle"
  | "waiting"
  | "initializing"
  | "loading"
  | "ready"
  | "context-lost"
  | "error";

export type CuviqErrorCode =
  | "UNSUPPORTED_SOURCE"
  | "LOAD_FAILED"
  | "RESOURCE_MISSING"
  | "CORS_ERROR"
  | "DECODER_REQUIRED"
  | "MODEL_EMPTY"
  | "WEBGL_UNAVAILABLE"
  | "WEBGL_CONTEXT_LOST";

export interface CuviqReadyDetail {
  source: CuviqSource;
}

export interface CuviqErrorDetail {
  code: CuviqErrorCode;
  message: string;
  source?: CuviqSource;
}

export interface ViewerRuntimeCallbacks {
  onStateChange(state: CuviqViewerState, message?: string): void;
  onReady(detail: CuviqReadyDetail): void;
  onError(detail: CuviqErrorDetail): void;
}
