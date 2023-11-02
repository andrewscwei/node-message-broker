import { typeIsSuperErrorObject, type SuperErrorObject } from '@andrewscwei/super-error'
import isPlainObject from 'lodash/isPlainObject'

export type MessagePayload = Readonly<{
  data: any
  error?: SuperErrorObject
}>

export type ExchangeType = 'fanout' | 'topic' | 'direct'

export type CorrelationID = string

/**
 * Validates that a given value is a valid payload.
 *
 * @param payload
 *
 * @returns `true` if valid, `false` otherwise.
 */
export function typeIsMessagePayload(value: any): value is MessagePayload {
  if (!isPlainObject(value)) return false

  const keys = Object.keys(value)

  if (keys.length < 1) return false
  if (keys.length > 2) return false

  const dataIdx = keys.indexOf('data')
  const errorIdx = keys.indexOf('error')

  if (dataIdx < 0) return false
  if (keys.length > 1 && errorIdx < 0) return false
  if (errorIdx > -1 && value.error !== undefined && value.error !== null && !typeIsSuperErrorObject(value.error)) return false

  return true
}

export function typeIsCorrelationID(value: any): value is CorrelationID {
  if (typeof value !== 'string') return false

  return true
}

/**
 * An action is a method passed to a consumer for handling the receiving of
 * incoming messages. Use `invokeActionWithPayload` or
 * `invokeActionWithRoutingKeyAndPayload` where appropriate. This action type
 * indicates that it has params. Params must exist in the form of a plain
 * object.
 */
export type ActionWithParams<T extends Record<string, any>> = (params: T) => any

/**
 * An action is a method passed to a consumer for handling the receiving of
 * incoming messages. Use `invokeAction`. This action type indicates that it has
 * no params.
 */
export type ActionWithoutParams = () => any
