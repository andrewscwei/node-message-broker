import { ActionWithParams, MessagePayload, MessagePayloadMake } from '../types';

export default function invokeActionWithRoutingKeyAndPayload<T extends { [key: string]: any } = {}>(action: ActionWithParams<T>, parser?: (routingKey: string, payload: MessagePayload) => T | Promise<T>) {
  return async (routingKey: string, payload: MessagePayload) => {
    const { data, error } = payload;

    if (error) throw new Error(error.message);

    const params = parser ? await parser(routingKey, { data }) : { ...data };
    const res = await action(params);
    return MessagePayloadMake(res);
  };
}
