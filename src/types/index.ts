import is from '@sindresorhus/is';
import { ErrorObject } from 'serialize-error';

export type MessagePayload = Readonly<{
  [key: string]: any;
}>;

export type ErrorPayload = Readonly<ErrorObject>;

export type ExchangeType = 'fanout' | 'topic' | 'direct';

/**
 * Validates that a given value is a valid payload.
 *
 * @param payload
 *
 * @returns `true` if valid, `false` otherwise.
 */
export function typeIsMessagePayload(payload: any): payload is MessagePayload {
  if (typeIsErrorPayload(payload)) return false;
  if (!is.plainObject(payload)) return false;
  return true;
}

export function typeIsErrorPayload(payload: any): payload is ErrorPayload {
  if (!payload.name) return false;
  if (!payload.stack) return false;
  if (!payload.message) return false;
  return true;
}
