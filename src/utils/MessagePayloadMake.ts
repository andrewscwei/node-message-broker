import SuperError from '@andrewscwei/super-error'
import _ from 'lodash'
import { MessagePayload } from '../types'

export default function MessagePayloadMake(value?: any): MessagePayload {
  if (_.isNil(value)) {
    return {
      data: null,
    }
  }
  else if (_.isError(value)) {
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
