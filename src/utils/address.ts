import { ethers } from 'ethers'

export const isAddress = (arg: any): arg is string =>
  ethers.utils.isAddress(arg)
