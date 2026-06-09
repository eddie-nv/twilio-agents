import type { Binding, InboundEvent } from '../types'

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function route(event: InboundEvent, bindings: Binding[]): string {
  const hasDefault = bindings.some(b => b.default === true)
  if (!hasDefault) {
    throw new ConfigError('No default binding configured')
  }

  for (const binding of bindings) {
    if (binding.keyword && event.body.toLowerCase().includes(binding.keyword.toLowerCase())) {
      return binding.agentId
    }
    if (binding.default) {
      return binding.agentId
    }
  }

  throw new ConfigError('No default binding configured')
}
