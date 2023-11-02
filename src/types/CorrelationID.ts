export type CorrelationID = string

export function typeIsCorrelationID(value: any): value is CorrelationID {
  if (typeof value !== 'string') return false

  return true
}
