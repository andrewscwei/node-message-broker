import { ActionWithParams, MessagePayload, MessagePayloadMake } from '../types';

/**
 * Maps an action to a function that can be used by consumers to handle incoming
 * messages. Also invokes the action with params derived from the payload of the
 * received message. The action can throw an error.
 *
 * @param action - The action to invoke.
 * @param parser - The function to map the payload of the received message to
 *                 the action's params.
 *
 * @returns {Function} A function that can be used by consumers to handle
 *                     incoming messages.
 *
 * @throws {Error} The message received from the publisher contains an error
 *                 in its payload.
 */
export default function invokeActionWithPayload<T extends { [key: string]: any } = {}>(action: ActionWithParams<T>, parser?: (payload: MessagePayload) => T | Promise<T>) {
  return async (payload: MessagePayload) => {
    const { data, error } = payload;

    if (error) throw new Error(error.message);

    const params = parser ? await parser({ data }) : { ...data };
    const res = await action(params);
    return MessagePayloadMake(res);
  };
}
