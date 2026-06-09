import { callClaude } from '../llm/claude'
import { SessionStore } from '../session/SessionStore'
import { appendMessage, pruneHistory } from '../session/session.utils'
import type { Session } from '../types'
import { BaseAgent } from './BaseAgent'

export const SYSTEM_PROMPT =
  'You are a helpful assistant communicating via SMS. Be concise and friendly.'

const MAX_HISTORY = 10
const FALLBACK = 'Agent unreachable. Please try again later.'

export class EchoAgent extends BaseAgent {
  constructor(private readonly store: Pick<SessionStore, 'save'>) {
    super()
  }

  async handle(session: Session, message: string): Promise<string> {
    const withUser = appendMessage(session.history, 'user', message)
    const pruned = pruneHistory(withUser, MAX_HISTORY)

    try {
      const reply = await callClaude(pruned, SYSTEM_PROMPT)
      const withReply = appendMessage(pruned, 'assistant', reply)
      await this.store.save({ ...session, history: withReply })
      return reply
    } catch {
      return FALLBACK
    }
  }
}
