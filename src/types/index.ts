import is from '@sindresorhus/is';

export type RPCPayload = Readonly<{
  [key: string]: any;
}>;

/**
 * Validates that a given value is a valid payload.
 *
 * @param payload
 *
 * @returns `true` if valid, `false` otherwise.
 */
export function isValidRPCPayload(payload: any): payload is RPCPayload {
  if (!is.plainObject(payload)) return false;
  return true;
}
