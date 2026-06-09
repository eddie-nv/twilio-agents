import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '../types'

const MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 1024

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export async function callClaude(
  messages: Message[],
  systemPrompt: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: MODEL,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
    })

    const first = response.content[0]
    if (first.type !== 'text') {
      throw new LLMError(`Unexpected content type: ${first.type}`)
    }
    return first.text
  } catch (err) {
    if (err instanceof LLMError) throw err
    const statusCode = (err as { status?: number }).status
    throw new LLMError(
      err instanceof Error ? err.message : 'Unknown LLM error',
      statusCode,
    )
  }
}
