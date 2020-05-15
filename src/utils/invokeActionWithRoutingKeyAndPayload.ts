import { ActionWithParams, MessagePayload, MessagePayloadMake } from '../types';

/**
 * Maps an action to a function that can be used by consumers to handle incoming
 * messages specifically for exchanges with routing keys. Also invokes the
 * action with params derived from the payload of the received message. The
 * action can throw an error.
 *
 * @param action - The action to invoke.
 * @param parser - The function to map the payload of the received message to
 *                 the action's params.
 * @param errorHandler - Handler invoked whenever there is an error thrown.
 *
 * @returns {Function} A function that can be used by consumers to handle
 *                     incoming messages.
 *
 * @throws {Error} The message received from the publisher contains an error
 *                 in its payload.
 */
export default function invokeActionWithRoutingKeyAndPayload<T extends { [key: string]: any } = {}>(action: ActionWithParams<T>, parser?: (routingKey: string, payload: MessagePayload) => T | Promise<T>, errorHandler?: (_: Error) => void) {
  return async (routingKey: string, payload: MessagePayload) => {
    try {
      const { data, error } = payload;

      if (error) throw new Error(error.message);

      const params = parser ? await parser(routingKey, { data }) : { ...data };
      const res = await action(params);

      return MessagePayloadMake(res);
    }
    catch (err) {
      errorHandler?.(err);
      throw err;
    }
  };
}
