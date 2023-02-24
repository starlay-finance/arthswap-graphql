import { GraphQLError } from 'graphql'
import { createYoga, createSchema } from 'graphql-yoga'
import type { NextApiRequest, NextApiResponse } from 'next'
import { cacheService } from 'src/services'
import { DEFAULT_ERROR_RESPONSE } from 'src/utils/api'

export const config = {}

const service = cacheService()

type NextContext = {
  req: NextApiRequest
  res: NextApiResponse
}
const schema = createSchema<NextContext>({
  typeDefs: /* Graphql */ `
    type Token {
      address: String!
      symbol: String!
    }

    type Pair {
      address: String!
      token0: Token!
      token1: Token!
    }

    type Price {
      token: String!
      priceInQuoteToken: String
    }

    type Prices {
      prices: [Price!]!
      quoteToken: String!
      quoteTokenPriceInUSD: String
      timestamp: String!
    }

    input PricesQueryInput {
      tokens: [String!]!
      quoteToken: String!
    }

    type Query {
      getPairs: [Pair!]
      getPrices(input: PricesQueryInput!): Prices!
    }
  `,
  resolvers: {
    Query: {
      getPairs: () => handleApiError(service.allPairs),
      getPrices: async (
        _,
        { input }: { input: { tokens: string[]; quoteToken: string } },
      ) => handleApiError(() => service.prices(input.tokens, input.quoteToken)),
    },
  },
})

const handleApiError = async <T extends {}>(
  resolver: () => Promise<T | Error>,
) => {
  const res = await resolver()
  if (!('error' in res)) return res

  if (res.error === DEFAULT_ERROR_RESPONSE.error) throw new Error(res.error)
  throw new GraphQLError(JSON.stringify(res.error))
}

export default createYoga<NextContext>({
  schema,
  graphqlEndpoint: '/api/graphql',
})
