import { SuperError } from '@andrewscwei/super-error'
import { type MessagePayload } from '../types/MessagePayload.js'

export function MessagePayloadMake(value?: any): MessagePayload {
  if (value === undefined || value === null) {
    return {
      data: null,
    }
  }
  else if (value instanceof Error) {
    return {
      data: null,
      error: SuperError.serialize(value),
    }
  }
  else {
    return {
      data: value,
    }
  }
}
