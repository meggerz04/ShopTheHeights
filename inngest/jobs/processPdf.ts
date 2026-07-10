import { inngest } from '@/inngest/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { embedDocuments } from '@/lib/voyage/client'
import pdfParse from 'pdf-parse'

const CHUNK_TOKENS = 500
const OVERLAP_TOKENS = 100
// Approximate: 1 token ≈ 4 characters for English text
const CHARS_PER_TOKEN = 4

function chunkText(text: string): string[] {
  const chunkSize = CHUNK_TOKENS * CHARS_PER_TOKEN
  const overlapSize = OVERLAP_TOKENS * CHARS_PER_TOKEN
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end === text.length) break
    start += chunkSize - overlapSize
  }

  return chunks.filter((c) => c.length > 0)
}

export const processPdf = inngest.createFunction(
  {
    id: 'process-pdf',
    name: 'Process PDF Document',
    triggers: [{ event: 'doc/pdf.upload' }],
  },
  async ({ event, step }) => {
    const { documentId, storagePath, municipalityId, businessTypeId } =
      event.data as {
        documentId: string
        storagePath: string
        municipalityId: string | null
        businessTypeId: string | null
      }

    const supabase = createAdminClient()

    // Step 1 — Download file from Supabase Storage
    // Returns a JSON-serializable form of the Buffer (Inngest serializes step outputs)
    const fileBufferData = await step.run('download-file', async () => {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)
      if (error) throw new Error(`Storage download failed: ${error.message}`)
      const ab = await data.arrayBuffer()
      return Array.from(new Uint8Array(ab))
    })

    // Step 2 — Extract text with pdf-parse
    // Reconstruct Buffer from the serialized Uint8Array data
    const text = await step.run('extract-text', async () => {
      const buf = Buffer.from(fileBufferData)
      const parsed = await pdfParse(buf)
      return parsed.text
    })

    // Step 3 — Chunk text (500 tokens, 100-token overlap)
    const chunks = await step.run('chunk-text', async () => {
      return chunkText(text)
    })

    // Step 4 — Batch embed with Voyage voyage-3.5
    const embeddings = await step.run('embed-chunks', async () => {
      return embedDocuments(chunks)
    })

    // Step 5 — Insert document_chunks rows
    await step.run('insert-chunks', async () => {
      const rows = chunks.map((content, i) => ({
        document_id: documentId,
        municipality_id: municipalityId,
        business_type_id: businessTypeId,
        content,
        embedding: JSON.stringify(embeddings[i]),
        metadata: { chunk_index: i },
      }))

      const { error } = await supabase.from('document_chunks').insert(rows)
      if (error) throw new Error(`Chunk insert failed: ${error.message}`)
    })

    // Step 6 — Mark document as ready
    await step.run('mark-ready', async () => {
      const { error } = await supabase
        .from('documents')
        .update({ status: 'ready' })
        .eq('id', documentId)
      if (error) throw new Error(`Status update failed: ${error.message}`)
    })

    return { documentId, chunkCount: chunks.length }
  }
)
