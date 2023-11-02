import parseJson from 'parse-json'
import { typeIsMessagePayload, type MessagePayload } from '../types/MessagePayload.js'
import { MessagePayloadMake } from './MessagePayloadMake.js'

export function decodePayload(buffer: Buffer): MessagePayload {
  const str = buffer.toString()
  const obj = parseJson(str)

  if (typeIsMessagePayload(obj)) {
    return obj
  }
  else {
    return MessagePayloadMake(new Error('Invalid payload format'))
  }
}
