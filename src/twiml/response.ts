export const MAX_SMS_LENGTH = 1600

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function segment(text: string): string[] {
  const segments: string[] = []
  for (let i = 0; i < text.length; i += MAX_SMS_LENGTH) {
    segments.push(text.slice(i, i + MAX_SMS_LENGTH))
  }
  return segments
}

export function buildTwimlResponse(text: string): string {
  const messages = segment(text)
    .map(s => `<Message>${escapeXml(s)}</Message>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${messages}</Response>`
}
