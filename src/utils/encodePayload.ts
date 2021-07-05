import { MessagePayload } from '../types'

export default function encodePayload(payload: MessagePayload): Buffer {
  return Buffer.from(JSON.stringify(payload))
}
