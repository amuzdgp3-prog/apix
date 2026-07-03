// =============================
// API client
// =============================

const API_BASE = "/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/auth/refresh`,
        { method: "POST", credentials: "same-origin" },
      );
      if (!res.ok) return null;
      const data = await res.json() as { accessToken?: string };
      const token = data.accessToken ?? null;
      if (token) localStorage.setItem("accessToken", token);
      return token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) =>
      url.searchParams.append(k, v),
    );
  }

  async function doFetch(token: string | null): Promise<T> {
    const res = await fetch(url.toString(), {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry once with new token
        const retryRes = await fetch(url.toString(), {
          ...options,
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
        if (retryRes.ok) return retryRes.json() as Promise<T>;
        if (retryRes.status === 401) {
          window.location.href = "/login";
          throw new ApiError(401, "Session expired");
        }
        const retryBody = await retryRes.json().catch(() => ({}));
        throw new ApiError(
          retryRes.status,
          (retryBody as { message?: string }).message ?? retryRes.statusText,
        );
      }
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        (body as { message?: string }).message ?? res.statusText,
      );
    }

    return res.json() as Promise<T>;
  }

  const token = localStorage.getItem("accessToken");
  return doFetch(token);
}

/**
 * Multipart form-data upload Р Т‘Р В»РЎРЏ POST /api/sync.
 *
 * Р С›РЎвЂљР С—РЎР‚Р В°Р Р†Р В»РЎРЏР ВµРЎвЂљ РЎвЂљР ВµР С”РЎРѓРЎвЂљР С•Р Р†РЎвЂ№Р Вµ Р С—Р С•Р В»РЎРЏ Р С”Р В°Р С” FormData-РЎвЂЎР В°РЎРѓРЎвЂљР С‘, РЎвЂћР В°Р в„–Р В»РЎвЂ№ Р С”Р В°Р С” Blob-РЎвЂЎР В°РЎРѓРЎвЂљР С‘.
 * Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµРЎвЂљ РЎР‚Р В°РЎРѓР С—Р В°РЎР‚РЎРѓР ВµР Р…Р Р…РЎвЂ№Р в„– JSON-Р С•РЎвЂљР Р†Р ВµРЎвЂљ.
 */
export async function uploadMultipart<T>(
  path: string,
  fields: Record<string, string>,
  files: Record<string, Blob>,
): Promise<T> {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  for (const [key, blob] of Object.entries(files)) {
    formData.append(key, blob, `${key}.jpg`);
  }

  const token = localStorage.getItem("accessToken");
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  async function doFetch(currentToken: string | null): Promise<Response> {
    const reqHeaders: Record<string, string> = currentToken
      ? { Authorization: `Bearer ${currentToken}` }
      : {};
    const res = await fetch(url.toString(), {
      headers: reqHeaders,
      credentials: "same-origin",
      method: "POST",
      body: formData,
    });
    return res;
  }

  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
      if (res.status === 401) {
        window.location.href = "/login";
        throw new ApiError(401, "Session expired");
      }
    } else {
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      (body as { message?: string }).message ?? res.statusText,
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => {
    const options = {
      ...opts,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    };
    return request<T>(path, options);
  },

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => {
    const options = {
      ...opts,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    };
    return request<T>(path, options);
  },

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};