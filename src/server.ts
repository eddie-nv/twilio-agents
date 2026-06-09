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
  console.log(`[SMS] ${req.method} ${req.url}`)

  const text = await req.text()
  const params: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(text)) {
    params[k] = v
  }
  console.log(`[SMS] From=${params.From} Body=${params.Body}`)

  const signature = req.headers.get('X-Twilio-Signature') ?? ''
  const proto = req.headers.get('X-Forwarded-Proto') ?? new URL(req.url).protocol.replace(':', '')
  const validationUrl = req.url.replace(/^https?:\/\//, `${proto}://`)
  if (!Twilio.validateRequest(TWILIO_AUTH_TOKEN!, signature, validationUrl, params)) {
    console.log(`[SMS] Signature validation FAILED — sig=${signature} url=${validationUrl}`)
    return new Response('Forbidden', { status: 403 })
  }
  console.log('[SMS] Signature valid')

  const from = params.From ?? ''
  const body = params.Body ?? ''
  const key = buildSessionKey(from)
  const session = await store.get(key)
  const agentId = route({ from, body, channel: 'sms' }, bindings)
  console.log(`[SMS] Routed to agentId=${agentId}`)
  const agent = agentMap[agentId]

  if (!agent) {
    console.log(`[SMS] No agent found for agentId=${agentId}`)
    return new Response('Agent not found', { status: 500 })
  }

  console.log('[SMS] Calling agent.handle...')
  const reply = await agent.handle(session, body)
  console.log(`[SMS] Reply: ${reply}`)

  return new Response(buildTwimlResponse(reply), {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}

export const server = Bun.serve({
  port: parseInt(process.env.PORT ?? '3000'),
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url)
    console.log(`[HTTP] ${req.method} ${pathname}`)
    if (req.method === 'POST' && pathname === '/sms') {
      return handleSms(req)
    }
    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Server listening on port ${server.port}`)
