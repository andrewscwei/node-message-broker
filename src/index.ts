import AMQPConnectionManager, { AMQPConnectionManagerOptions } from './core/AMQPConnectionManager';

/**
 * Creates a new connection manager instance.
 *
 * @param url - URL of the MQ server to connect to.
 * @param options - @see AMQPConnectionManagerOptions
 */
export default function factory(url?: string, options?: AMQPConnectionManagerOptions): AMQPConnectionManager {
  return new AMQPConnectionManager(url, options);
}

export { default as RPCClient } from './core/RPCClient';
export { default as RPCServer } from './core/RPCServer';
export * from './enums';
export * from './types';
export * from './utils';
export { AMQPConnectionManager, AMQPConnectionManagerOptions };
