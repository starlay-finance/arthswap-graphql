import { priceService } from 'src/services'
import { isAddress } from 'src/utils/address'
import { asHandler, RequestValidator } from 'src/utils/api'

const ALLOWED_LENGTH = 20

type Parameters = {
  tokens: string[]
  quoteToken: string
}
const validator: RequestValidator<Parameters> = (request) => {
  const {
    query: { tokens, quoteToken },
  } = request
  if (!isAddress(quoteToken))
    return { error: '"quoteToken" must be hex string.' }
  if (!Array.isArray(tokens)) {
    return isAddress(tokens)
      ? { tokens: [tokens], quoteToken }
      : { error: '"tokens" must be hex string(s).' }
  }
  if (tokens.length > ALLOWED_LENGTH)
    return {
      error: `Number of "tokens" must be less than or equal to ${ALLOWED_LENGTH}.`,
    }
  if (!tokens.every(isAddress))
    return { error: '"tokens" must be hex string(s).' }
  return { tokens, quoteToken }
}

const handler = asHandler(
  ({ parameters: { tokens, quoteToken } }) =>
    priceService().prices(tokens, quoteToken),
  { validator },
)

export default handler
