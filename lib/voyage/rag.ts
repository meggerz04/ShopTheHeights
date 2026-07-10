'use server'

import { createClient } from '@/lib/supabase/server'
import { embedQuery } from '@/lib/voyage/client'

export interface RagChunk {
  id: number
  content: string
  similarity: number
  metadata: {
    chunk_index?: number
    page_number?: number
    source_title?: string
    [key: string]: unknown
  }
}

export async function searchChunks(
  query: string,
  municipalityId: string,
  {
    threshold = 0.5,
    count = 5,
  }: { threshold?: number; count?: number } = {}
): Promise<RagChunk[]> {
  const supabase = await createClient()
  const embedding = await embedQuery(query)

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    threshold,
    count,
    p_municipality_id: municipalityId,
  })

  if (error) throw new Error(`RAG search failed: ${error.message}`)
  return (data ?? []) as RagChunk[]
}
