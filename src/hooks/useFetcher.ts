import { createSessionFetcher } from "../utils"

type Fetcher = <T>(path: string) => Promise<T>

const fetcher = createSessionFetcher()

export function useFetcher(): Fetcher {
	return fetcher
}
