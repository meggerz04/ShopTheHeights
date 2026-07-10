import { VoyageAIClient } from 'voyageai'

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! })

export async function embedQuery(text: string): Promise<number[]> {
  const result = await voyage.embed({
    input: text,
    model: 'voyage-3.5',
    inputType: 'query',
  })
  return result.data![0].embedding as number[]
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const result = await voyage.embed({
    input: texts,
    model: 'voyage-3.5',
    inputType: 'document',
  })
  return result.data!.map((d) => d.embedding!)
}
