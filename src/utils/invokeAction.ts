import { ActionWithoutParams, MessagePayload, MessagePayloadMake } from '../types';

/**
 * Maps an action to a function that can be used by consumers to handle incoming
 * messages. Also invokes the action without params. The action can throw an
 * error.
 *
 * @param action - The action to invoke.
 *
 * @returns {Function} A function that can be used by consumers to handle
 *                     incoming messages.
 *
 * @throws {Error} The message received from the publisher contains an error
 *                 in its payload.
 */
export default function invokeAction(action: ActionWithoutParams) {
  return async (payload: MessagePayload) => {
    const { data, error } = payload;

    if (error) throw new Error(error.message);

    const res = await action();

    return MessagePayloadMake(res);
  };
}
