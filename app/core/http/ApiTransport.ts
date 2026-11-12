import type { AnyServerRouteMethod, TypedFetchOptions } from 'nuxt/app'
import type { useRequestFetch } from '#imports'

export type ApiRequestOptions = TypedFetchOptions<string, AnyServerRouteMethod>

export interface ApiTransport {
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>
  download(path: string): Promise<Blob>
}

/** Each Nuxt application/request owns its transport, including SSR cookie forwarding. */
export class NuxtApiTransport implements ApiTransport {
  constructor(private readonly fetcher: ReturnType<typeof useRequestFetch>) {}

  request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.fetcher<T, string, AnyServerRouteMethod>(`/api${path}`, options)
  }

  download(path: string): Promise<Blob> {
    return this.fetcher<Blob>(`/api${path}`, { responseType: 'blob' })
  }
}
