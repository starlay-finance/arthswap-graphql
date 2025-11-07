export const SELF_ENDPOINT = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `http://localhost:3000`

export const RPC_URL = process.env.RPC_URL || 'https://evm.astar.network'
