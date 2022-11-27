import useDebug from 'debug'
import AMQPConnectionManager, { AMQPConnectionManagerOptions } from './core/AMQPConnectionManager'
import RPCClient from './core/RPCClient'
import RPCServer from './core/RPCServer'

const debug = useDebug('message-broker')

export type Configuration = AMQPConnectionManagerOptions & {
  host: string
}

/**
 * Global mq configuration options (only if you are using default managers).
 */
let config: Configuration

/**
 * Default publisher instance.
 */
let publisher: AMQPConnectionManager

/**
 * Default consumer instance.
 */
let consumer: AMQPConnectionManager

/**
 * Default RPC client instance.
 */
let rpcClient: RPCClient

/**
 * Default RPC server instance.
 */
let rpcServer: RPCServer

/**
 * Configures the message broker (only if you are using default managers).
 *
 * @param options - Configuration options.
 */
export function configureMb(options: Configuration) {
  if (!config) {
    config = options
    debug('Configured message broker', JSON.stringify(options, undefined, 0))
  }
  else {
    debug('You only need to configure the message broker once')
  }
}

/**
 * Creates a new connection manager instance.
 */
export default function factory(): AMQPConnectionManager {
  if (!config) throw new Error('You must call configureMb() before using this method')
  const { host, ...options } = config

  return new AMQPConnectionManager(host, options)
}

/**
 * Gets the default publisher instance.
 *
 * @returns The default publisher instance.
 */
export function getDefaultPublisher(): AMQPConnectionManager {
  if (!publisher) publisher = factory()

  return publisher
}

/**
 * Gets the default consumer instance.
 *
 * @returns The default consumer instance.
 */
export function getDefaultConsumer(): AMQPConnectionManager {
  if (!consumer) consumer = factory()

  return consumer
}

/**
 * Gets the default RPC client instance.
 *
 * @returns The default RPC client instance.
 */
export function getDefaultRPCClient(): RPCClient {
  if (!config) throw new Error('You must call configureMb() before using this method')
  const { host, ...options } = config
  if (!rpcClient) rpcClient = new RPCClient(host, options)

  return rpcClient
}

/**
 * Gets the default RPC server instance.
 *
 * @returns The default RPC server instance.
 */
export function getDefaultRPCServer(): RPCServer {
  if (!config) throw new Error('You must call configureMb() before using this method')
  const { host, ...options } = config
  if (!rpcServer) rpcServer = new RPCServer(host, options)

  return rpcServer
}

export * from './enums'
export * from './types'
export * from './utils'
export { AMQPConnectionManager, AMQPConnectionManagerOptions, RPCServer, RPCClient }
