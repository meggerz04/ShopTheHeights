import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { processPdf } from '@/inngest/jobs/processPdf'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processPdf],
})
