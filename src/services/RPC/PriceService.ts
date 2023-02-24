import { JsonRpcProvider } from '@ethersproject/providers'
import { BytesLike, providers } from 'ethers'
import {
  DIA_DECIMALS,
  DIA_KEY,
  DIA_ORACLE_V2_ADDRESS,
  FACTORY_ADDRESS,
  MULTICALL_ADDRESS,
  RPC_URL,
} from 'src/constants'
import {
  IPancakeFactory,
  IPancakeFactory__factory,
  Multicall,
  Multicall__factory,
} from 'src/contracts'
import { IDIAOracleV2__factory } from 'src/contracts/factories/IDIAOracleV2__factory'
import { IERC20__factory } from 'src/contracts/factories/IERC20__factory'
import {
  IDIAOracleV2,
  IDIAOracleV2Interface,
} from 'src/contracts/IDIAOracleV2'
import { IERC20, IERC20Interface } from 'src/contracts/IERC20'
import { toBigNumberJs } from 'src/utils/bignumberJs'
import { IPriceService, Price } from '../types'
import { multicallChunked, toCall } from './utils'

export class PriceServiceRPC implements IPriceService {
  private constructor(
    private factory: IPancakeFactory,
    private iERC20: IERC20Interface,
    private iDIAOracleV2: IDIAOracleV2Interface,
    private multicall: Multicall,
    private provider: providers.Provider,
  ) {}

  static new = () => {
    const provider = new JsonRpcProvider(RPC_URL)
    return new PriceServiceRPC(
      IPancakeFactory__factory.connect(FACTORY_ADDRESS, provider),
      IERC20__factory.createInterface(),
      IDIAOracleV2__factory.createInterface(),
      Multicall__factory.connect(MULTICALL_ADDRESS, provider),
      provider,
    )
  }

  prices: IPriceService['prices'] = async (tokens, quoteToken) => {
    const { iERC20, iDIAOracleV2, multicall, provider } = this
    const pairAddresses = await this.pairAddresses(tokens, quoteToken)

    const { blockNumber, returnData } = await multicall.callStatic.aggregate([
      toCall(
        DIA_ORACLE_V2_ADDRESS,
        iDIAOracleV2.encodeFunctionData('getValue', [
          DIA_KEY[quoteToken] || '',
        ]),
      ),
      toCall(quoteToken, iERC20.encodeFunctionData('decimals')),
      ...pairAddresses.flatMap((address, idx) => [
        toCall(tokens[idx], iERC20.encodeFunctionData('decimals')),
        toCall(tokens[idx], iERC20.encodeFunctionData('balanceOf', [address])),
        toCall(quoteToken, iERC20.encodeFunctionData('balanceOf', [address])),
      ]),
    ])

    const prices: Price[] = []
    const timestamp = (await provider.getBlock(
      blockNumber.toNumber(),
    ))!.timestamp.toString()

    let cursor = 0
    const { price } = iDIAOracleV2.decodeFunctionResult(
      'getValue',
      returnData[cursor++],
    ) as Awaited<ReturnType<IDIAOracleV2['getValue']>>
    const quoteTokenPriceInUSD = !price.isZero()
      ? toBigNumberJs(price, DIA_DECIMALS).toString()
      : undefined

    const quoteTokenDecimals = this.decodeDeimals(returnData[cursor++])
    while (cursor < returnData.length) {
      const tokenDecimals = this.decodeDeimals(returnData[cursor++])
      const tokenBalance = this.decodeBalanceOf(returnData[cursor++])
      const quoteTokenBalance = this.decodeBalanceOf(returnData[cursor++])

      const priceInQuoteToken = !tokenBalance.isZero()
        ? toBigNumberJs(quoteTokenBalance, quoteTokenDecimals)
            .div(toBigNumberJs(tokenBalance, tokenDecimals))
            .toString()
        : undefined

      prices.push({ token: tokens[prices.length], priceInQuoteToken })
    }

    return { prices, quoteToken, quoteTokenPriceInUSD, timestamp }
  }

  private pairAddresses = async (tokens: string[], quoteToken: string) => {
    const { factory, multicall } = this
    const iFactory = factory.interface

    const returnData = await multicallChunked(
      multicall,
      tokens.map((token) =>
        toCall(
          factory.address,
          iFactory.encodeFunctionData('getPair', [token, quoteToken]),
        ),
      ),
    )
    return returnData.map(
      (data) => iFactory.decodeFunctionResult('getPair', data)[0],
    ) as Awaited<ReturnType<IPancakeFactory['getPair']>>[]
  }

  private decodeDeimals = (data: BytesLike) =>
    this.iERC20.decodeFunctionResult('decimals', data)[0] as Awaited<
      ReturnType<IERC20['decimals']>
    >

  private decodeBalanceOf = (data: BytesLike) =>
    this.iERC20.decodeFunctionResult('balanceOf', data)[0] as Awaited<
      ReturnType<IERC20['balanceOf']>
    >
}
