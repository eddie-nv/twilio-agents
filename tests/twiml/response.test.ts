import { expect, test } from 'bun:test'
import { buildTwimlResponse, MAX_SMS_LENGTH } from '../../src/twiml/response'

test('returns valid TwiML XML with Response and Message tags', () => {
  // Act
  const xml = buildTwimlResponse('hello')

  // Assert
  expect(xml).toStartWith('<?xml')
  expect(xml).toContain('<Response>')
  expect(xml).toContain('<Message>')
  expect(xml).toContain('hello')
  expect(xml).toContain('</Message>')
  expect(xml).toContain('</Response>')
})

test('splits message longer than MAX_SMS_LENGTH into multiple segments', () => {
  // Arrange — build a string just over two segments long
  const text = 'a'.repeat(MAX_SMS_LENGTH + 1)

  // Act
  const xml = buildTwimlResponse(text)

  // Assert — must contain exactly 2 <Message> nodes
  const count = (xml.match(/<Message>/g) ?? []).length
  expect(count).toBe(2)
})

test('escapes XML special characters in message body', () => {
  // Act
  const xml = buildTwimlResponse('5 > 3 & 1 < 2')

  // Assert
  expect(xml).toContain('&gt;')
  expect(xml).toContain('&amp;')
  expect(xml).toContain('&lt;')
  expect(xml).not.toContain(' > ')
  expect(xml).not.toContain(' & ')
  expect(xml).not.toContain(' < ')
})
