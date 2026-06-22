import { useQuery } from '@tanstack/react-query'

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function useApiQuery<T>(key: Array<string>, path: string, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet<T>(path),
    enabled,
  })
}
