/**
 * An action is a method passed to a consumer for handling the receiving of
 * incoming messages. Use `invokeActionWithPayload` or
 * `invokeActionWithRoutingKeyAndPayload` where appropriate. This action type
 * indicates that it has params. Params must exist in the form of a plain
 * object.
 */
export type ActionWithParams<T extends Record<string, any>> = (params: T) => any

/**
 * An action is a method passed to a consumer for handling the receiving of
 * incoming messages. Use `invokeAction`. This action type indicates that it has
 * no params.
 */
export type ActionWithoutParams = () => any
