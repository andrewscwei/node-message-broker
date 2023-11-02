import { v4 as uuid } from 'uuid'

export function createCorrelationId(): string {
  return uuid()
}
