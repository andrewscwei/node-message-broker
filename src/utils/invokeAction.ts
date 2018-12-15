import { ActionWithoutParams, MessagePayload, MessagePayloadMake } from '../types';

export default function invokeAction(action: ActionWithoutParams) {
  return async (payload: MessagePayload) => {
    const { data, error } = payload;

    if (error) throw new Error(error.message);

    await action();

    return MessagePayloadMake();
  };
}
