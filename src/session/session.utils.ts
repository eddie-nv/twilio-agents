import type { Message } from '../types'

export function buildSessionKey(phoneNumber: string): string {
  return `phone:${phoneNumber}`
}

export function pruneHistory(history: Message[], maxMessages: number): Message[] {
  return history.slice(-maxMessages)
}

export function appendMessage(
  history: Message[],
  role: Message['role'],
  content: string,
): Message[] {
  const message: Message = {
    role,
    content,
    timestamp: new Date().toISOString(),
  }
  return [...history, message]
}
