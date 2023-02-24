import { Error } from 'src/utils/api'
import { SELF_ENDPOINT } from 'src/utils/env'
import { Pair, Prices } from '../types'

export class CacheService {
  private constructor(readonly endpoint: string) {}

  static new = () => new CacheService(SELF_ENDPOINT)

  allPairs = () => this.fetch<Pair[]>('/api/pairs')

  prices = (tokens: string[], quoteToken: string) =>
    this.fetch<Prices>(
      `/api/prices?quoteToken=${[quoteToken, ...tokens].join('&tokens=')}`,
    )

  private fetch = async <T>(path: string): Promise<T | Error> =>
    fetch(`${this.endpoint}${path}`).then((res) => res.json())
}
