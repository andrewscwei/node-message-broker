import { typeIsSuperErrorObject, type SuperErrorObject } from '@andrewscwei/super-error'
import isPlainObject from 'lodash/isPlainObject.js'

export type MessagePayload = Readonly<{
  data: any
  error?: SuperErrorObject
}>

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
