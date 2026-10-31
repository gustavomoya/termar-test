const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000"
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Error generated when the server responds with an HTTP code indicating that the request was unsuccessful (4xx or 5xx).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

/**
 * Error related to communication problems(lack of connection, inaccessible server or timeout).
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Function used to make HTTP requests to the backend.
 * 
 * @param path      endpoint path
 * @param init      additional fetch options (method, headers, body, etc.).
 * @param timeoutMs maximum wait time in milliseconds.
 * @returns 
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  //Used to be able to cancel the request if it exceeds the maximum waiting time
  const controller = new AbortController();
  let timedOut = false;

  //Set timer
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        `Request failed with status ${response.status}`,
        response.status,
        url,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (timedOut) {
      throw new NetworkError(`Request timed out after ${timeoutMs} ms`);
    }

    throw new NetworkError(
      error instanceof Error ? error.message : "Network request failed",
    );
  } finally {
    //clear the timer
    clearTimeout(timeout);
  }
}
