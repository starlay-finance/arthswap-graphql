import BigNumberJs from 'bignumber.js'
import { ethers } from 'ethers'

export { BigNumberJs }

BigNumberJs.config({ EXPONENTIAL_AT: 1e9 })

export const toBigNumberJs = (bignumber: ethers.BigNumberish, decimals: number) =>
  new BigNumberJs(bignumber.toString()).shiftedBy(-decimals)
