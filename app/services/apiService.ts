import type { AnyServerRouteMethod, TypedFetchOptions } from 'nuxt/app'

/** Stateless transport: session cookies are forwarded by Nuxt during SSR. */
export class ApiService {
  request<T>(path: string, options: TypedFetchOptions<string, AnyServerRouteMethod> = {}) {
    const fetcher = useRequestFetch()
    return fetcher<T, string, AnyServerRouteMethod>(`/api${path}`, options)
  }

  download(path: string) {
    return $fetch<Blob>(`/api${path}`, { responseType: 'blob' })
  }
}

export const apiService = new ApiService()
