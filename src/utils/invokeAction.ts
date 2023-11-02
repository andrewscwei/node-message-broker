import { SuperError } from '@andrewscwei/super-error'
import { type ActionWithoutParams, type MessagePayload } from '../types'
import { MessagePayloadMake } from '../utils'

/**
 * Maps an action to a function that can be used by consumers to handle incoming
 * messages. Also invokes the action without params. The action can throw an
 * error.
 *
 * @param action The action to invoke.
 * @param errorHandler Handler invoked whenever there is an error thrown.
 *
 * @returns A function that can be used by consumers to handle incoming
 *          messages.
 *
 * @throws {Error} The message received from the publisher contains an error in
 *                 its payload.
 */
export function invokeAction(action: ActionWithoutParams, errorHandler?: (e: unknown) => void) {
  return async (payload: MessagePayload) => {
    try {
      const { error } = payload

      if (error) throw SuperError.deserialize(error)

      const res = await action()

      return MessagePayloadMake(res)
    }
    catch (err) {
      errorHandler?.(err)
      throw err
    }
  }
}
