import is from '@sindresorhus/is';
import serializeError, { ErrorObject } from 'serialize-error';

export type MessagePayload = Readonly<{
  data: any;
  error?: ErrorObject;
}>;

export type ExchangeType = 'fanout' | 'topic' | 'direct';

export type CorrelationID = string;

/**
 * Validates that a given value is a valid payload.
 *
 * @param payload
 *
 * @returns `true` if valid, `false` otherwise.
 */
export function typeIsMessagePayload(value: any): value is MessagePayload {
  if (!is.plainObject(value)) return false;

  const keys = Object.keys(value);

  if (keys.length < 1) return false;
  if (keys.length > 2) return false;

  const dataIdx = keys.indexOf('data');
  const errorIdx = keys.indexOf('error');

  if (dataIdx < 0) return false;
  if (keys.length > 1 && errorIdx < 0) return false;
  if ((errorIdx > -1) && !is.nullOrUndefined(value.error) && !typeIsErrorObject(value.error)) return false;

  return true;
}

export function MessagePayloadMake(value?: any): MessagePayload {
  if (is.nullOrUndefined(value)) {
    return {
      data: null,
    };
  }
  else if (is.error(value)) {
    return {
      data: null,
      error: serializeError(value),
    };
  }
  else {
    return {
      data: value,
    };
  }
}

export function typeIsCorrelationID(value: any): value is CorrelationID {
  if (!is.string(value)) return false;
  return true;
}

export function typeIsErrorObject(value: any): value is ErrorObject {
  if (!is.plainObject(value)) return false;
  if (!value.name) return false;
  if (!value.stack) return false;
  if (!value.message) return false;
  return true;
}

/**
 * An action is a method passed to a consumer for handling the receiving of
 * incoming messages. Use `invokeActionWithPayload` or
 * `invokeActionWithRoutingKeyAndPayload` where appropriate. This action type
 * indicates that it has params. Params must exist in the form of a plain
 * object.
 */
export type ActionWithParams<T extends { [key: string]: any }> = (params: T) => any;

/**
 * An action is a method passed to a consumer for handling the receiving of
 * incoming messages. Use `invokeAction`. This action type indicates that it has
 * no params.
 */
export type ActionWithoutParams = () => any;
