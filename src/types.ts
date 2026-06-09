export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Session {
  id: string
  binding: string
  history: Message[]
}

export interface Binding {
  agentId: string
  default?: boolean
  keyword?: string
  channel?: 'sms' | 'voice'
}

export interface InboundEvent {
  from: string
  body: string
  channel: 'sms' | 'voice'
}
