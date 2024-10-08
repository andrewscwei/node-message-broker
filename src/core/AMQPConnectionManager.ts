import amqplib, { type Channel, type Connection } from 'amqplib'
import useDebug from 'debug'
import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import { AMQPEventType } from '../enums/index.js'
import { typeIsCorrelationID, typeIsMessagePayload, type CorrelationID, type ExchangeType, type MessagePayload } from '../types/index.js'
import { MessagePayloadMake, createCorrelationId, decodePayload, encodePayload } from '../utils/index.js'

const debug = useDebug('message-broker')

const DEFAULT_REPLY_TO_QUEUE = 'amq.rabbitmq.reply-to'

export type AMQPConnectionManagerOptions = {
  /**
   * Time in seconds to wait before attempting to auto-reconnect whenever the
   * connection is lost. Specify 0 to never auto-reconnect.
   */
  heartbeat?: number
}

export type AMQPConnectionManagerSendToQueueOptions = {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable and the message that is sent will be marked as
   * persistent, i.e. setting `persistent` to `true`.
   */
  durable?: boolean

  /**
   * Indicates the name of the queue on which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue. If set to `false`, no reply is expected from
   * the consumer.
   */
  replyTo?: string | boolean

  /**
   * Timeout in milliseconds to throw an error when the specified time has
   * passed whilst the channel hasn't given any response. This is only used if
   * `replyTo` is set. Set this to `0` or `undefined` to indicate no timeout.
   */
  timeout?: number
}

export type AMQPConnectionManagerReceiveFromQueueOptions = {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number

  /**
   * Specifies whether the opened channel should be closed automatically after
   * the message is received.
   */
  autoCloseChannel?: boolean
}

export type AMQPConnectionManagerSendToExchangeOptions = {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable.
   */
  durable?: boolean

  /**
   * Specifies the exchange type.
   */
  exchangeType?: ExchangeType

  /**
   * Indicates the routing key of the exchange to publish to. Note that this
   * value does nothing if the exchange type is set to `fanout`.
   */
  key?: string

  /**
   * Indicates the name of the queue on which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue. If set to `false`, no reply is expected from
   * the consumer.
   */
  replyTo?: boolean | string

  /**
   * Timeout in milliseconds to throw an error when the specified time has
   * passed whilst the channel hasn't given any response. This is only used if
   * `replyTo` is set. Set this to `0` or `undefined` to indicate no timeout.
   */
  timeout?: number
}

export type AMQPConnectionManagerReceiveFromExchangeOptions = {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean

  /**
   * Specifies the exchange type.
   */
  exchangeType?: ExchangeType

  /**
   * Indicates the routing key(s) of the exchange to subscribe to.
   */
  keys?: string | string[]

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number

  /**
   * Specifies whether the opened channel should be closed automatically after
   * the message is received.
   */
  autoCloseChannel?: boolean
}

export type AMQPConnectionManagerBroadcastOptions = {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable and the message that is sent will be marked as
   * persistent, i.e. setting `persistent` to `true`.
   */
  durable?: boolean
}

export type AMQPConnectionManagerListenOptions = {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number

  /**
   * Specifies whether the opened channel should be closed automatically after
   * the message is received.
   */
  autoCloseChannel?: boolean
}

export type AMQPConnectionManagerSendToTopicOptions = {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable.
   */
  durable?: boolean

  /**
   * Indicates the name of the queue on which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue. If set to `false`, no reply is expected from
   * the consumer.
   */
  replyTo?: boolean | string

  /**
   * Timeout in milliseconds to throw an error when the specified time has
   * passed whilst the channel hasn't given any response. This is only used if
   * `replyTo` is set. Set this to `0` or `undefined` to indicate no timeout.
   */
  timeout?: number
}

export type AMQPConnectionManagerReceiveFromTopicOptions = {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number

  /**
   * Specifies whether the opened channel should be closed automatically after
   * the message is received.
   */
  autoCloseChannel?: boolean
}

export type AMQPConnectionManagerSendToDirectExchangeOptions = {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable.
   */
  durable?: boolean

  /**
   * Indicates the name of the queue on which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue. If set to `false`, no reply is expected from
   * the consumer.
   */
  replyTo?: boolean | string

  /**
   * Timeout in milliseconds to throw an error when the specified time has
   * passed whilst the channel hasn't given any response. This is only used if
   * `durable` is `false` and `replyTo` is set. Set this to `0` or `undefined`
   * to indicate no timeout.
   */
  timeout?: number
}

export type AMQPConnectionManagerReceiveFromDirectExchangeOptions = {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number

  /**
   * Specifies whether the opened channel should be closed automatically after
   * the message is received.
   */
  autoCloseChannel?: boolean
}

export class AMQPConnectionManager extends EventEmitter {
  readonly channels: Channel[] = []

  protected connection?: Connection

  protected isConnecting = false

  private heartbeat = 3

  private url = 'amqp://localhost:5672'

  private uuid: string = uuid()

  /**
   * Creates a new AMQPConnectionManager instance.
   *
   * @param url URL of the message queue server.
   * @param options See {@link AMQPConnectionManagerOptions}.
   *
   * @returns A new AMQPConnectionManager instance.
   */
  constructor(url?: string, options: AMQPConnectionManagerOptions = {}) {
    super()

    if (url) this.url = `amqp://${url}`
    if (options.heartbeat) this.heartbeat = options.heartbeat

    debug(`Instantiating a new AMQPConnectionManager <${this.id}>`)

    // Attempt to connect right away.
    this.connect()
  }

  get id() { return this.uuid }

  /**
   * Checks if this AMQPConnectionManager instance is connected to the MQ
   * message-broker.
   *
   * @returns `true` if connected, `false` otherwise.
   */
  isConnected(): boolean {
    return this.connection !== undefined && this.connection !== null
  }

  /**
   * Connect to the message queue server.
   *
   * @returns The connection instance.
   */
  async connect(): Promise<Connection> {
    if (this.connection) return this.connection

    if (this.isConnecting) {
      await new Promise<void>((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => {
          resolve()
        })
      })

      return this.connect()
    }

    debug(`<${this.id}> is connecting to ${this.url}...`)

    this.isConnecting = true

    try {
      this.connection = await amqplib.connect(this.url)

      debug(`<${this.id}> connected successfully`)

      this.isConnecting = false

      this.emit(AMQPEventType.CONNECT)

      this.connection.on('blocked', this.onConnectionBlocked)
      this.connection.on('unblocked', this.onConnectionUnblocked)
      this.connection.on('close', this.onConnectionClose)
      this.connection.on('error', this.onConnectionError)

      return this.connection
    }
    catch (err) {
      debug(`Unable to connect to ${this.url}, retrying in ${this.heartbeat}s`)

      this.isConnecting = false

      await this.pulse()

      return this.connect()
    }
  }

  /**
   * Disconnect from the message queue server (if a connection already exists).
   */
  async disconnect() {
    if (this.connection) {
      this.connection.close()

      await new Promise<void>((resolve, reject) => {
        this.once(AMQPEventType.DISCONNECT, () => {
          resolve()
        })
      })
    }
  }

  /**
   * Sends a message to an exchange.
   *
   * @param exchange Name of the exchange.
   * @param payload Message payload.
   * @param options See {@link AMQPConnectionManagerSendToExchangeOptions}.
   *
   * @returns The correlation ID if this method does not expect a reply from the
   *          consumer. Otherwise it returns the reply from the consumer.
   *
   * @throws {TypeError} Invalid payload.
   * @throws {Error} Timed out waiting for a reply from the consumer.
   */
  async sendToExchange(exchange: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    exchangeType = 'fanout',
    key = '',
    replyTo = false,
    timeout = 0,
  }: AMQPConnectionManagerSendToExchangeOptions = {}): Promise<MessagePayload | CorrelationID> {
    if (!typeIsMessagePayload(payload)) throw new TypeError('Invalid payload format')

    const channel = await this.createChannel()

    await channel.assertExchange(exchange, exchangeType, { durable })

    debug(`[${exchange}] Sending message to exchange with key "${key}"...`)

    return new Promise<MessagePayload | CorrelationID>((resolve, reject) => {
      const routingKey = exchangeType === 'fanout' ? '' : key
      const buffer = encodePayload(payload)

      if (replyTo !== false) {
        const replyQueue = replyTo === true ? DEFAULT_REPLY_TO_QUEUE : replyTo

        let timer: NodeJS.Timeout | undefined

        if (timeout && timeout > 0) {
          timer = setTimeout(() => {
            debug(`[${exchange}] Receiving response in reply queue [${replyQueue}] for correlation ID ${correlationId}...`, 'ERR', 'Timed out while waiting for response from consumer')

            if (timer !== undefined) {
              clearTimeout(timer)
              timer = undefined
            }

            channel.close().then(() => reject(new Error('Timed out while waiting for response from consumer')))
          }, timeout)
        }

        channel.consume(replyQueue, message => {
          if (!message || message.properties.correlationId !== correlationId) return

          debug(`[${exchange}] Receiving response in reply queue [${replyQueue}] for correlation ID ${correlationId}...`, 'OK')

          if (timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
          }

          channel.close().then(() => resolve(decodePayload(message.content)))
        }, {
          noAck: true,
        })

        channel.publish(exchange, routingKey, buffer, {
          correlationId,
          contentType: 'application/json',
          persistent: durable,
          replyTo: replyQueue,
        })

        debug(`[${exchange}] Sending message to exchange with key "${key}"...`, 'OK')
      }
      else {
        channel.publish(exchange, routingKey, buffer, {
          correlationId,
          contentType: 'application/json',
          persistent: durable,
        })

        debug(`[${exchange}] Sending message to exchange with key "${key}"...`, 'OK')

        channel.close().then(() => resolve(correlationId))
      }
    })
  }

  /**
   * Creates a new channel and waits for a message to arrive in an exchange. If
   * there is an error handling the message (when it arrives) and a reply-to
   * queue is provided, the error is serialized into an object and sent back to
   * the publisher. Otherwise the error is thrown.
   *
   * @param exchange Name of the exchange.
   * @param handler Handler invoked when the message is received.
   * @param options See {@link AMQPConnectionManagerReceiveFromExchangeOptions}.
   *
   * @returns The channel created.
   *
   * @throws {Error} Something went wrong while handling the received message,
   *                 usually due to the handler function provided.
   */
  async receiveFromExchange(exchange: string, handler: (routingKey: string, payload: MessagePayload) => Promise<MessagePayload> | Promise<void>, {
    ack = true,
    durable = true,
    exchangeType = 'fanout',
    keys = '',
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromExchangeOptions = {}): Promise<Channel> {
    const channel = await this.createChannel()

    await channel.assertExchange(exchange, exchangeType, { durable })

    const { queue } = await channel.assertQueue('', { exclusive: true })

    if (typeof keys === 'string') {
      await channel.bindQueue(queue, exchange, keys)
    }
    else {
      for (const key of keys) {
        await channel.bindQueue(queue, exchange, key)
      }
    }

    debug(`[${exchange}] Listening for exchange with keys "${keys}"...`)

    channel.prefetch(prefetch)

    await channel.consume(queue, async message => {
      if (!message) {
        debug(`[${exchange}] No message received for keys "${keys}"`)

        if (autoCloseChannel) {
          await channel.close()
        }

        return
      }

      debug(`[${exchange}] Received message from publisher for keys "${keys}"`)

      try {
        if (message.properties.contentType !== 'application/json') {
          console.error(new TypeError('The message content type must be of JSON format'))

          return
        }

        const payload = await handler(message.fields.routingKey, decodePayload(message.content))

        if (message.properties.replyTo) {
          debug(`[${exchange}] Sending success response to publisher for keys "${keys}"...`)

          channel.sendToQueue(message.properties.replyTo, encodePayload(payload || MessagePayloadMake()), {
            correlationId: message.properties.correlationId,
            contentType: 'application/json',
          })
        }

        if (ack) {
          channel.ack(message)
        }
      }
      catch (err) {
        debug(`[${exchange}] Error occured while handling message for keys "${keys}": ${err}`)

        if (message.properties.replyTo) {
          debug(`[${exchange}] Sending error response to publisher for keys "${keys}"...`)

          channel.sendToQueue(message.properties.replyTo, encodePayload(MessagePayloadMake(err)), {
            correlationId: message.properties.correlationId,
            contentType: 'application/json',
          })

          if (ack) channel.nack(message, false, false)
        }
        else if (ack) channel.nack(message, false, false)
      }

      if (autoCloseChannel) {
        await channel.close()
      }
    }, {
      noAck: !ack,
    })

    return channel
  }

  /**
   * Sends a message directly to a queue.
   *
   * @param queue Name of the queue.
   * @param payload Message payload.
   * @param options See {@link AMQPConnectionManagerSendToQueueOptions}.
   *
   * @returns A message payload from the consumer if this operation expects a
   *          reply, the correlation ID otherwise.
   *
   * @throws {TypeError} Invalid payload.
   * @throws {Error} Timed out waiting for a reply from the consumer.
   */
  async sendToQueue(queue: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = false,
    timeout = 0,
  }: AMQPConnectionManagerSendToQueueOptions = {}): Promise<MessagePayload | CorrelationID> {
    if (!typeIsMessagePayload(payload)) throw new TypeError('Invalid payload format')

    const channel = await this.createChannel()

    await channel.assertQueue(queue, { durable })

    debug(`[${queue}] Sending message...`)

    return new Promise<MessagePayload | CorrelationID>((resolve, reject) => {
      if (replyTo !== false) {
        const replyQueue = replyTo === true ? DEFAULT_REPLY_TO_QUEUE : replyTo

        let timer: NodeJS.Timeout | undefined

        if (timeout && timeout > 0) {
          timer = setTimeout(() => {
            debug(`[${queue}] Receiving response in reply queue [${replyQueue}] for correlation ID ${correlationId}...`, 'ERR', 'Timed out while waiting for response from consumer')

            if (timer !== undefined) {
              clearTimeout(timer)
              timer = undefined
            }

            channel.close().then(() => reject(new Error('Timed out while waiting for response from consumer')))
          }, timeout)
        }

        channel.consume(replyQueue, message => {
          if (!message || message.properties.correlationId !== correlationId) return

          debug(`[${queue}] Receiving response in reply queue [${replyQueue}] for correlation ID ${correlationId}...`, 'OK')

          channel.close().then(() => resolve(decodePayload(message.content)))
        }, {
          noAck: true,
        })
      }

      channel.sendToQueue(queue, encodePayload(payload), {
        correlationId,
        contentType: 'application/json',
        replyTo: replyTo === false ? undefined : replyTo === true ? DEFAULT_REPLY_TO_QUEUE : replyTo,
        persistent: durable,
      })

      debug(`[${queue}] Sending message...`, 'OK')

      if (replyTo === false) {
        channel.close().then(() => resolve(correlationId))
      }
    })
  }

  /**
   * Creates a new channel and waits for a message to arrive in a queue. If
   * there is an error handling the message (when it arrives) and a reply-to
   * queue is provided, the error is serialized into an object and sent back to
   * the publisher. Otherwise the error is thrown.
   *
   * @param queue Name of the queue.
   * @param handler Handler invoked when the message is received.
   * @param options See {@link AMQPConnectionManagerReceiveFromQueueOptions}.
   *
   * @returns The created channel.
   *
   * @throws {TypeError} Invalid message content type.
   * @throws {Error} Something went wrong while handling the received message,
   *                 usually due to the handler function provided.
   */
  async receiveFromQueue(queue: string, handler: (payload: MessagePayload) => Promise<MessagePayload> | Promise<void>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromQueueOptions = {}): Promise<Channel> {
    debug(`[${queue}] Listening for queue...`)

    const channel = await this.createChannel()

    await channel.assertQueue(queue, { durable })

    channel.prefetch(prefetch)

    await channel.consume(queue, async message => {
      if (!message) {
        debug(`[${queue}] No message received`)

        if (autoCloseChannel) {
          await channel.close()
        }

        return
      }

      debug(`[${queue}] Received message from publisher on queue`)

      try {
        if (message.properties.contentType !== 'application/json') {
          console.error(new TypeError('The message content type must be of JSON format'))

          return
        }

        const payload = await handler(decodePayload(message.content))

        if (message.properties.replyTo) {
          debug(`[${queue}] Sending success response to publisher...`)

          channel.sendToQueue(message.properties.replyTo, encodePayload(payload || MessagePayloadMake()), {
            correlationId: message.properties.correlationId,
            contentType: 'application/json',
          })
        }

        if (ack) {
          debug(`[${queue}] Sending receipt acknowledgement to publisher...`)
          channel.ack(message)
        }
      }
      catch (err) {
        debug(`[${queue}] Error occured while handling message: ${err}`)

        if (message.properties.replyTo) {
          debug(`[${queue}] Sending error response to publisher for queue...`)

          channel.sendToQueue(message.properties.replyTo, encodePayload(MessagePayloadMake(err)), {
            correlationId: message.properties.correlationId,
            contentType: 'application/json',
          })

          if (ack) channel.nack(message, false, false)
        }
        else if (ack) channel.nack(message, false, false)
      }

      if (autoCloseChannel) {
        await channel.close()
      }
    }, {
      noAck: !ack,
    })

    return channel
  }

  /**
   * Broadcasts a message to an exchange.
   *
   * @param exchange Name of the exchange.
   * @param payload Message payload.
   * @param options See {@link AMQPConnectionManagerBroadcastOptions}.
   *
   * @returns The correlation ID.
   *
   * @throws {Error} Invalid return value, should be a correlation ID.
   */
  async broadcast(exchange: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
  }: AMQPConnectionManagerBroadcastOptions = {}): Promise<CorrelationID> {
    const corrId = await this.sendToExchange(exchange, payload, {
      correlationId,
      durable,
      exchangeType: 'fanout',
      key: '',
      replyTo: false,
    })

    if (!typeIsCorrelationID(corrId)) throw new Error('Expected return value to be a valid correlation ID')

    return corrId
  }

  /**
   * Listens for a message broadcast.
   *
   * @param exchange Name of the exchange.
   * @param handler Handler invoked when the message is received.
   * @param options See {@link AMQPConnectionManagerListenOptions}.
   *
   * @returns The created channel.
   */
  async listen(exchange: string, handler: (payload: MessagePayload) => Promise<MessagePayload> | Promise<void>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerListenOptions = {}): Promise<Channel> {
    return this.receiveFromExchange(exchange, (routingKey, payload) => handler(payload), {
      ack,
      durable,
      exchangeType: 'fanout',
      keys: '',
      prefetch,
      autoCloseChannel,
    })
  }

  /**
   * Sends a message to a direct exchange.
   *
   * @param exchange Name of the exchange.
   * @param key Routing key of the direct exchange.
   * @param payload Message payload.
   * @param options See {@link AMQPConnectionManagerSendToDirectExchangeOptions}.
   *
   * @returns The correlation ID.
   */
  async sendToDirectExchange(exchange: string, key: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = false,
    timeout = 0,
  }: AMQPConnectionManagerSendToDirectExchangeOptions = {}): Promise<MessagePayload | CorrelationID> {
    const res = await this.sendToExchange(exchange, payload, {
      correlationId,
      durable,
      exchangeType: 'direct',
      key,
      replyTo,
      timeout,
    })

    return res
  }

  /**
   * Listens for a message to arrive for a direct exchange.
   *
   * @param exchange Name of the exchange.
   * @param key Routing key of the direct exchange.
   * @param handler Handler invoked when the message is received.
   * @param options See {@link AMQPConnectionManagerReceiveFromDirectExchangeOptions}.
   *
   * @returns The created channel.
   */
  async receiveFromDirectExchange(exchange: string, key: string, handler: (payload: MessagePayload) => Promise<MessagePayload> | Promise<void>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromDirectExchangeOptions = {}): Promise<Channel> {
    return this.receiveFromExchange(exchange, (routingKey, payload) => handler(payload), {
      ack,
      durable,
      exchangeType: 'direct',
      keys: key,
      prefetch,
      autoCloseChannel,
    })
  }

  /**
   * Sends a message to a topic.
   *
   * @param exchange Name of the exchange.
   * @param topic Routing key of the topic.
   * @param payload Message payload.
   * @param options See {@link AMQPConnectionManagerSendToTopicOptions}.
   *
   * @returns The correlation ID.
   */
  async sendToTopic(exchange: string, topic: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = false,
    timeout = 0,
  }: AMQPConnectionManagerSendToTopicOptions = {}): Promise<MessagePayload | CorrelationID> {
    const res = await this.sendToExchange(exchange, payload, {
      correlationId,
      durable,
      exchangeType: 'topic',
      key: topic,
      replyTo,
      timeout,
    })

    return res
  }

  /**
   * Listens for a message to arrive for a topic.
   *
   * @param exchange Name of the exchange.
   * @param topic Routing key(s) of the topic.
   * @param handler Handler invoked when the message is received.
   * @param options See {@link AMQPConnectionManagerReceiveFromTopicOptions}.
   *
   * @returns The created channel.
   */
  async receiveFromTopic(exchange: string, topic: string | string[], handler: (routingKey: string, payload: MessagePayload) => Promise<MessagePayload> | Promise<void>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromTopicOptions = {}): Promise<Channel> {
    return this.receiveFromExchange(exchange, handler, {
      ack,
      durable,
      exchangeType: 'topic',
      keys: topic,
      prefetch,
      autoCloseChannel,
    })
  }

  /**
   * Cleans up the connection instance.
   */
  private async onDisconnect() {
    if (this.connection) {
      this.connection.removeAllListeners()

      try {
        await this.connection.close()
      }
      catch (err) {
        debug(`Failed to close the connection because: ${err}`)
      }

      this.connection = undefined

      this.emit(AMQPEventType.DISCONNECT)
    }
  }

  /**
   * Pulse for the duration of the heartbeat provided. This basically means wait
   * for a few seconds (whatever the heartbeat is set to).
   */
  private async pulse() {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, this.heartbeat * 1000)
    })
  }

  /**
   * Creates a new channel. Use this convenience method to store the channel
   * instance internally.
   */
  private async createChannel(): Promise<Channel> {
    // Ensure there is an active connection. If not, retry once a connection is
    // established.
    if (!this.connection) {
      return new Promise<Channel>(resolve => {
        this.once(AMQPEventType.CONNECT, () => this.createChannel().then(res => resolve(res)))
      })
    }

    const channel = await this.connection.createChannel()
    const i = this.channels.indexOf(channel)
    if (i < 0) this.channels.push(channel)

    channel.on('close', () => {
      const j = this.channels.indexOf(channel)
      if (j < 0) return
      this.channels.splice(j, 1)
    })

    return channel
  }

  /**
   * Handler invoked when the connection is blocked.
   *
   * @param reason The reason why the connection is blocked.
   */
  private onConnectionBlocked = (reason: string) => {
    debug(`MQ server blocked the connection because: ${reason}`)

    this.emit(AMQPEventType.BLOCKED, { reason })
  }

  /**
   * Handler invoked when the connection is unblocked.
   */
  private onConnectionUnblocked = () => {
    debug('MQ server has unblocked the connection')

    this.emit(AMQPEventType.UNBLOCKED)
  }

  /**
   * Handler invoked when there is a connection error.
   *
   * @param error The error.
   */
  private onConnectionError = (error: Error) => {
    debug(`An error occured in the MQ connection: ${error}`)

    this.emit(AMQPEventType.ERROR)

    this.onDisconnect().then(() => this.connect())
  }

  /**
   * Handler invoked when the connection is closed.
   *
   * @param error The error.
   */
  private onConnectionClose = (error: Error) => {
    debug(`MQ connection closed: ${error}`)

    this.onDisconnect().then(() => this.connect())
  }
}
