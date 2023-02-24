export type Token = {
  address: string
  symbol: string
}

export type Pair = {
  address: string
  token0: Token
  token1: Token
}

export type Price = {
  token: string
  priceInQuoteToken: string | undefined
}

export type Prices = {
  prices: Price[]
  quoteToken: string
  quoteTokenPriceInUSD: string | undefined
  timestamp: string
}

export type IPairService = {
  allPairs: () => Promise<Pair[]>
}

export type IPriceService = {
  prices: (tokens: string[], quoteToken: string) => Promise<Prices>
}
