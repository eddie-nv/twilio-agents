import { join } from 'node:path'
import type { Session } from '../types'

const DEFAULT_SESSION_DIR = process.env.SESSION_DIR ?? 'data/sessions'

export class SessionStore {
  private readonly dir: string

  constructor(dir: string = DEFAULT_SESSION_DIR) {
    this.dir = dir
  }

  async get(key: string): Promise<Session> {
    const filePath = this.filePath(key)
    const file = Bun.file(filePath)

    const exists = await file.exists()
    if (!exists) {
      return this.fresh(key)
    }

    try {
      const text = await file.text()
      const lines = text.trim().split('\n').filter(Boolean)
      const last = lines[lines.length - 1]
      return JSON.parse(last) as Session
    } catch {
      return this.fresh(key)
    }
  }

  async save(session: Session): Promise<void> {
    const filePath = this.filePath(session.id)
    const existing = Bun.file(filePath)
    const prev = (await existing.exists()) ? await existing.text() : ''
    await Bun.write(filePath, prev + JSON.stringify(session) + '\n')
  }

  private filePath(key: string): string {
    return join(this.dir, `${encodeURIComponent(key)}.jsonl`)
  }

  private fresh(key: string): Session {
    return { id: key, binding: 'echoAgent', history: [] }
  }
}
