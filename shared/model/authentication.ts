export const authProviders = ['microsoft', 'google'] as const
export type AuthProvider = typeof authProviders[number]
