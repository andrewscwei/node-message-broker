import { type MessagePayload } from '../types/MessagePayload.js'

export function encodePayload(payload: MessagePayload): Buffer {
  return Buffer.from(JSON.stringify(payload))
}
