import is from '@sindresorhus/is';

export type MessagePayload = Readonly<{
  [key: string]: any;
}>;

export type ExchangeType = 'fanout' | 'topic' | 'direct';

/**
 * Validates that a given value is a valid payload.
 *
 * @param payload
 *
 * @returns `true` if valid, `false` otherwise.
 */
export function isValidMessagePayload(payload: any): payload is MessagePayload {
  if (!is.plainObject(payload)) return false;
  return true;
}
