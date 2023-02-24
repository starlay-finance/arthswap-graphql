import { pairService } from 'src/services'
import { asHandler, cacheControl } from 'src/utils/api'

const handler = asHandler(() => pairService().allPairs(), {
  headers: { 'Cache-Control': cacheControl(3600, 4800) },
})

export default handler
