/**
 * Cliente HTTP minimalista para hablar con el backend KinePro.
 * Inyecta el JWT desde localStorage si existe.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('kinepro_token');
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body === 'object' ? body?.message ?? 'Error' : String(body));
    this.status = status;
    this.body = body;
  }
}

export async function api<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
