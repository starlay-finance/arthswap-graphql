import { BytesLike } from 'ethers'
import { Multicall, Multicall2 } from 'src/contracts/Multicall'

const CHUNK_SIZE = 20

export const multicallChunked = async (
  multicall: Multicall,
  callData: Multicall2.CallStruct[],
  chunkSize = CHUNK_SIZE,
) => {
  let result: string[] = []
  let next = 0
  while (next < callData.length) {
    const { returnData } = await multicall.callStatic.aggregate(
      callData.slice(next, next + chunkSize),
    )
    result = result.concat(returnData)
    next += chunkSize
  }
  return result
}

export const toCall = (
  target: string,
  callData: BytesLike,
): Multicall2.CallStruct => ({
  callData,
  target,
})
