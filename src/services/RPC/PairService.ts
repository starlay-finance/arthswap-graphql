import { JsonRpcProvider } from '@ethersproject/providers'
import { FACTORY_ADDRESS, MULTICALL_ADDRESS, RPC_URL } from 'src/constants'
import {
  IPancakeFactory,
  IPancakeFactory__factory,
  IPancakePair,
  IPancakePair__factory,
  Multicall,
  Multicall__factory,
} from 'src/contracts'
import { IERC20__factory } from 'src/contracts/factories/IERC20__factory'
import { IERC20, IERC20Interface } from 'src/contracts/IERC20'
import { IPancakePairInterface } from 'src/contracts/IPancakePair'
import { IPairService, Token } from '../types'
import { multicallChunked, toCall } from './utils'

export class PairServiceRPC implements IPairService {
  private constructor(
    private factory: IPancakeFactory,
    private iPair: IPancakePairInterface,
    private iERC20: IERC20Interface,
    private multicall: Multicall,
  ) {}

  static new = () => {
    const provider = new JsonRpcProvider(RPC_URL)
    return new PairServiceRPC(
      IPancakeFactory__factory.connect(FACTORY_ADDRESS, provider),
      IPancakePair__factory.createInterface(),
      IERC20__factory.createInterface(),
      Multicall__factory.connect(MULTICALL_ADDRESS, provider),
    )
  }

  allPairs: IPairService['allPairs'] = async () => {
    const { iPair, multicall } = this
    const allPairAddresses = await this.allPairAddresses()

    const returnData = await multicallChunked(
      multicall,
      allPairAddresses.flatMap((address) => [
        toCall(address, iPair.encodeFunctionData('token0')),
        toCall(address, iPair.encodeFunctionData('token1')),
      ]),
    )

    const allPairsAddresses: {
      address: string
      token0: string
      token1: string
    }[] = []
    let cursor = 0
    while (cursor < returnData.length) {
      const address = allPairAddresses[allPairsAddresses.length]
      const token0 = iPair.decodeFunctionResult(
        'token0',
        returnData[cursor++],
      )[0] as Awaited<ReturnType<IPancakePair['token0']>>

      const token1 = iPair.decodeFunctionResult(
        'token1',
        returnData[cursor++],
      )[0] as Awaited<ReturnType<IPancakePair['token1']>>

      allPairsAddresses.push({ address, token0, token1 })
    }

    const allTokenAddresses = Array.from(
      new Set(
        allPairsAddresses.flatMap(({ token0, token1 }) => [token0, token1]),
      ),
    )
    const tokenInfo = await this.tokenInfo(allTokenAddresses)

    return allPairsAddresses.map(({ address, token0, token1 }) => ({
      address,
      token0: tokenInfo[token0],
      token1: tokenInfo[token1],
    }))
  }

  private allPairAddresses = async () => {
    const { factory, multicall } = this
    const iFactory = factory.interface

    const allPairsLength = (await factory.allPairsLength()).toNumber()

    const returnData = await multicallChunked(
      multicall,
      Array.from(new Array(allPairsLength)).map((_, idx) =>
        toCall(factory.address, iFactory.encodeFunctionData('allPairs', [idx])),
      ),
    )
    return returnData.map(
      (data) => iFactory.decodeFunctionResult('allPairs', data)[0],
    ) as Awaited<ReturnType<IPancakeFactory['allPairs']>>[]
  }

  private tokenInfo = async (tokens: string[]) => {
    const { iERC20, multicall } = this

    const returnData = await multicallChunked(
      multicall,
      tokens.flatMap((token) => [
        toCall(token, iERC20.encodeFunctionData('symbol')),
      ]),
    )

    const tokenInfo: Record<string, Token> = {}
    for (let i = 0; i < returnData.length; i++) {
      const address = tokens[i]
      const symbol = iERC20.decodeFunctionResult(
        'symbol',
        returnData[i],
      )[0] as Awaited<ReturnType<IERC20['symbol']>>

      tokenInfo[address] = { address, symbol }
    }
    return tokenInfo
  }
}
