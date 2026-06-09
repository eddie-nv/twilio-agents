import type { Session } from '../types'

export abstract class BaseAgent {
  abstract handle(session: Session, message: string): Promise<string>
}
