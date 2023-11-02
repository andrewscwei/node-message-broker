import { type MessagePayload } from '../types'

export function encodePayload(payload: MessagePayload): Buffer {
  return Buffer.from(JSON.stringify(payload))
}
