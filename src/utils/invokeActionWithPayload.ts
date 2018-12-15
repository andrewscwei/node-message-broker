import { ActionWithParams, MessagePayload, MessagePayloadMake } from '../types';

export default function invokeActionWithPayload<T extends { [key: string]: any } = {}>(action: ActionWithParams<T>, parser: (payload: MessagePayload) => T | Promise<T>) {
  return async (payload: MessagePayload) => {
    const { data, error } = payload;

    if (error) throw new Error(error.message);

    const params = await parser({ data });
    const res = await action(params);
    return MessagePayloadMake(res);
  };
}
