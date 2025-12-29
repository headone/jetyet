import type { AppSchema } from "@/api";
import { toast } from "sonner";
import { dequal } from "dequal";

type Paths = keyof AppSchema;
type Methods<P extends Paths> = keyof AppSchema[P];

type RequestOptions<
  P extends Paths,
  M extends Methods<P>,
> = (AppSchema[P][M] extends { body: infer B } ? { body: B } : {}) &
  (AppSchema[P][M] extends { params: infer Pa } ? { params: Pa } : {}) &
  (AppSchema[P][M] extends { headers: infer H } ? { headers: H } : {}) &
  Omit<RequestInit, "body" | "method" | "headers">;

export async function apiCall<P extends Paths, M extends Methods<P>>(
  path: P,
  method: M,
  options?: RequestOptions<P, M>,
): Promise<AppSchema[P][M] extends { response: infer R } ? R : void> {
  let url = path as string;
  const opts = (options as any) || {};

  // fill url params
  if (opts.params) {
    for (const key in opts.params) {
      url = url.replace(`:${key}`, opts.params[key]);
    }
  }

  // request
  const res = await fetch(url, {
    method: method as string,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("authToken") || "",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("authToken");
  }

  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errorBody = await res.json();
      errorMsg = errorBody.message || JSON.stringify(errorBody);
    } catch {}
    toast.error(errorMsg);
    throw new Error(`API Error ${res.status}: ${errorMsg}`);
  }

  if (res.status === 204) {
    return undefined as any;
  }

  try {
    return await res.json();
  } catch {
    return undefined as any;
  }
}

const SWR_CACHE = new Map<string, { data: any; requestId: number }>();
let requestIdCounter = 0;

export async function apiCallSWR<P extends Paths, M extends Methods<P>>(
  path: P,
  method: M,
  options: RequestOptions<P, M> | undefined,
  handler: (
    data: AppSchema[P][M] extends { response: infer R } ? R : void,
  ) => void,
): Promise<void> {
  const cacheKey = `${path}-${method as string}-${JSON.stringify(options || {})}`;
  const currentRequestId = ++requestIdCounter;

  const cachedEntry = SWR_CACHE.get(cacheKey);
  if (cachedEntry && !!cachedEntry.data) {
    handler(cachedEntry.data);
    cachedEntry.requestId = currentRequestId;
  } else {
    SWR_CACHE.set(cacheKey, { data: null, requestId: currentRequestId });
  }

  const newData = await apiCall(path, method, options);

  const latestEntry = SWR_CACHE.get(cacheKey);
  if (latestEntry && latestEntry.requestId !== currentRequestId) {
    return;
  }
  if (dequal(newData, cachedEntry?.data)) {
    return;
  }

  SWR_CACHE.set(cacheKey, { data: newData, requestId: currentRequestId });
  handler(newData);
}
