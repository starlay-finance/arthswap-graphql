import { CacheService } from './Cache'
import { PairServiceRPC } from './RPC/PairService'
import { PriceServiceRPC } from './RPC/PriceService'
import { IPairService, IPriceService } from './types'

export const pairService = (): IPairService => PairServiceRPC.new()

export const priceService = (): IPriceService => PriceServiceRPC.new()

export const cacheService = () => CacheService.new()
