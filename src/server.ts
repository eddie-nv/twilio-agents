import Twilio from 'twilio'
import { EchoAgent } from './agents/EchoAgent'
import { route } from './router/BindingRouter'
import { bindings } from './router/bindings.config'
import { SessionStore } from './session/SessionStore'
import { buildSessionKey } from './session/session.utils'
import { buildTwimlResponse } from './twiml/response'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const SESSION_DIR = process.env.SESSION_DIR ?? 'data/sessions'

if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')
if (!TWILIO_AUTH_TOKEN) throw new Error('TWILIO_AUTH_TOKEN not configured')

const store = new SessionStore(SESSION_DIR)
const agentMap: Record<string, EchoAgent> = {
  echoAgent: new EchoAgent(store),
}

async function handleSms(req: Request): Promise<Response> {
  const text = await req.text()
  const params: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(text)) {
    params[k] = v
  }

  const signature = req.headers.get('X-Twilio-Signature') ?? ''
  if (!Twilio.validateRequest(TWILIO_AUTH_TOKEN!, signature, req.url, params)) {
    return new Response('Forbidden', { status: 403 })
  }

  const from = params.From ?? ''
  const body = params.Body ?? ''
  const key = buildSessionKey(from)
  const session = await store.get(key)
  const agentId = route({ from, body, channel: 'sms' }, bindings)
  const agent = agentMap[agentId]

  if (!agent) {
    return new Response('Agent not found', { status: 500 })
  }

  const reply = await agent.handle(session, body)

  return new Response(buildTwimlResponse(reply), {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}

export const server = Bun.serve({
  port: parseInt(process.env.PORT ?? '3000'),
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (req.method === 'POST' && pathname === '/sms') {
      return handleSms(req)
    }
    return new Response('Not Found', { status: 404 })
  },
})
