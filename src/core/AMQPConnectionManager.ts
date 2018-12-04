import is from '@sindresorhus/is';
import amqplib, { Connection } from 'amqplib';
import { EventEmitter } from 'events';
import uuid from 'uuid/v1';
import { AMQPEventType } from '../enums';
import { isValidMessagePayload, MessagePayload } from '../types';

const debug = require('debug')('message-broker');

const DEFAULT_REPLY_TO_QUEUE = 'amq.rabbitmq.reply-to';

type ExchangeType = 'fanout' | 'topic' | 'direct';

export interface AMQPConnectionManagerOptions {
  /**
   * Time in seconds to wait before attempting to auto-reconnect whenever the
   * connection is lost. Specify 0 to never auto-reconnect.
   */
  heartbeat?: number;
}

export interface AMQPConnectionManagerSendToQueueOptions {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string;

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable and the message that is sent will be marked as
   * persistent, i.e. setting `deliveryMode` to `true`.
   */
  durable?: boolean;

  /**
   * Indicates the name of the queue on which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue. If set to `false`, no reply is expected from
   * the consumer.
   */
  replyTo?: string | boolean;
}

export interface AMQPConnectionManagerReceiveFromQueueOptions {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean;

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean;

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number;
}

export interface AMQPConnectionManagerSendToExchangeOptions {
  /**
   * Correlation ID of this message. If none provided, a random one will be
   * generated.
   */
  correlationId?: string;

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable.
   */
  durable?: boolean;

  /**
   * Specifies the exchange type.
   */
  exchangeType?: ExchangeType;

  /**
   * Indicates the routing key of the exchange to publish to. Note that this
   * value does nothing if the exchange type is set to `fanout`.
   */
  key?: string;

  /**
   * Indicates the name of the queue on which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue. If set to `false`, no reply is expected from
   * the consumer.
   */
  replyTo?: boolean | string;
}

export interface AMQPConnectionManagerReceiveFromExchangeOptions {
  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean;

  /**
   * Indicates whether the queue which the publisher sent its messages to is
   * marked as durable. This is required because in case the queue is not
   * created or destroyed for whatever reason, the consumer can recreate the
   * queue with the same properties.
   */
  durable?: boolean;

  /**
   * Specifies the exchange type.
   */
  exchangeType?: ExchangeType;

  /**
   * Indicates the routing key(s) of the exchange to subscribe to.
   */
  keys?: string | string[];

  /**
   * Determines how many messages this consumer can receive on the same queue
   * before any acknowledgement was sent.
   */
  prefetch?: number;
}

export default class AMQPConnectionManager extends EventEmitter {
  protected connection?: Connection;
  protected isConnecting: boolean = false;
  private heartbeat: number = 3;
  private url: string = 'amqp://localhost:5672';
  private uuid: string = uuid();

  get id() { return this.uuid; }

  /**
   * Creates a new AMQPConnectionManager instance.
   *
   * @param url - URL of the message queue server.
   * @param options - @see AMQPConnectionManagerOptions
   *
   * @returns A new AMQPConnectionManager instance.
   */
  constructor(url?: string, options: AMQPConnectionManagerOptions = {}) {
    super();

    if (url) this.url = `amqp://${url}`;
    if (options.heartbeat) this.heartbeat = options.heartbeat;

    debug(`Instantiating a new AMQPConnectionManager <${this.id}>`);

    // Attempt to connect right away.
    this.connect();
  }

  /**
   * Checks if this AMQPConnectionManager instance is connected to the MQ
   * message-broker.
   *
   * @returns `true` if connected, `false` otherwise.
   */
  isConnected(): boolean {
    return !is.nullOrUndefined(this.connection);
  }

  /**
   * Connect to the message queue server.
   *
   * @returns The connection instance.
   */
  async connect(): Promise<Connection> {
    if (this.connection) return this.connection;

    if (this.isConnecting) {
      await new Promise((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => {
          resolve();
        });
      });

      return this.connect();
    }

    debug(`<${this.id}> is connecting to ${this.url}...`);

    this.isConnecting = true;

    try {
      this.connection = await amqplib.connect(this.url);

      debug(`<${this.id}> connected successfully`);

      this.isConnecting = false;

      this.emit(AMQPEventType.CONNECT);

      this.connection.on('blocked', this.onConnectionBlocked);
      this.connection.on('unblocked', this.onConnectionUnblocked);
      this.connection.on('close', this.onConnectionClose);
      this.connection.on('error', this.onConnectionError);

      return this.connection;
    }
    catch (err) {
      debug(`Unable to connect to ${this.url}, retrying in ${this.heartbeat}s`);

      this.isConnecting = false;

      await this.pulse();
      return this.connect();
    }
  }

  /**
   * Disconnect from the message queue server (if a connection already exists).
   */
  async disconnect() {
    if (this.connection) {
      this.connection.close();

      await new Promise((resolve, reject) => {
        this.once(AMQPEventType.DISCONNECT, () => {
          resolve();
        });
      });
    }
  }

  /**
   * Sends a message to an exchange.
   *
   * @param exchange - Name of the exchange.
   * @param payload - Message payload.
   * @param options - @see AMQPConnectionManagerSendToExchangeOptions
   *
   * @returns The correlation ID if this method does not expect a reply from the
   *          consumer. Otherwise it returns the reply from the consumer.
   */
  async sendToExchange(exchange: string, payload: MessagePayload, {
    correlationId = uuid(),
    durable = true,
    exchangeType = 'fanout',
    key = '',
    replyTo = false,
  }: AMQPConnectionManagerSendToExchangeOptions = {}): Promise<MessagePayload | string> {
    // Ensure there is a connection.
    if (!this.connection) {
      return new Promise(resolve => {
        this.once(AMQPEventType.CONNECT, () => this.sendToExchange(exchange, payload, {
          correlationId,
          durable,
          exchangeType,
          key,
          replyTo,
        }).then(res => resolve(res)));
      });
    }

    // Ensure message payload is valid.
    if (!isValidMessagePayload(payload)) throw new Error('Invalid message payload provided, it must be a plain object');

    const channel = await this.connection.createChannel();

    await channel.assertExchange(exchange, exchangeType, { durable });

    debug(`Sending message to exchange "${exchange}" with key "${key}"...`);

    return new Promise<MessagePayload | string>(resolve => {
      const routingKey = exchangeType === 'fanout' ? '' : key;
      const buffer = Buffer.from(JSON.stringify(payload));

      if (replyTo !== false) {
        const replyQueue = replyTo === true ? DEFAULT_REPLY_TO_QUEUE : replyTo;

        channel.consume(replyQueue, message => {
          if (!message || (message.properties.correlationId !== correlationId)) return;

          debug(`Received response in reply queue for correlation ID ${correlationId}`);

          channel.close().then(() => resolve(JSON.parse(message.content as any)));
        }, {
          noAck: true,
        });

        channel.publish(exchange, routingKey, buffer, {
          correlationId,
          contentType: 'application/json',
          deliveryMode: durable,
          replyTo: replyQueue,
        });
      }
      else {
        channel.publish(exchange, routingKey, buffer, {
          correlationId,
          contentType: 'application/json',
          deliveryMode: durable,
        });

        channel.close().then(() => resolve(correlationId));
      }
    });
  }

  /**
   * Rceives a message from an exchange.
   *
   * @param exchange - Name of the exchange.
   * @param handler - Handler invoked when the message is received.
   * @param options - @see AMQPConnectionManagerReceiveFromExchangeOptions
   */
  async receiveFromExchange(exchange: string, handler: (routingKey: string, payload?: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    exchangeType = 'fanout',
    keys = '',
    prefetch = 1,
  }: AMQPConnectionManagerReceiveFromExchangeOptions = {}) {
    // Ensure there is an active connection.
    if (!this.connection) {
      return new Promise<void>((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => this.receiveFromExchange(exchange, handler, {
          ack,
          durable,
          exchangeType,
          keys,
          prefetch,
        }).then(() => resolve()));
      });
    }

    const channel = await this.connection.createChannel();

    await channel.assertExchange(exchange, exchangeType, { durable });

    const { queue } = await channel.assertQueue('', { exclusive: true });

    if (is.string(keys)) {
      await channel.bindQueue(queue, exchange, keys);
    }
    else {
      for (const key of keys) {
        await channel.bindQueue(queue, exchange, key);
      }
    }

    debug(`Listening for exchange "${exchange}" with keys "${keys}"...`);

    channel.prefetch(prefetch);

    await channel.consume(queue, message => {
      if (!message) {
        debug('No message received');
        return;
      }

      debug('Received message from publisher');

      const payload = JSON.parse(message.content as any);

      if (message.properties.contentType !== 'application/json') {
        throw new Error('The message content type must be of JSON format');
      }

      if (!isValidMessagePayload(payload)) {
        throw new Error('The message content type must be of JSON format');
      }

      handler(message.fields.routingKey, payload)
        .then(out => {
          if (message.properties.replyTo) {
            debug('Sending response to publisher...');

            channel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(out || {})), {
              correlationId: message.properties.correlationId,
              contentType: 'application/json',
            });
          }

          if (ack) {
            channel.ack(message);
          }
        })
        .catch(err => {
          debug(`Error occured while handling message: ${err}`);

          if (ack) {
            channel.nack(message, false, false);
          }
        });
    }, {
      noAck: !ack,
    });
  }

  /**
   * Sends a message directly to a queue.
   *
   * @param queue - Name of the queue.
   * @param payload - Message payload.
   * @param options - @see AMQPConnectionManagerSendToQueueOptions
   *
   * @returns A message payload from the consumer if this operation expects a
   *          reply, the correlation ID otherwise.
   */
  async sendToQueue(queue: string, payload: MessagePayload, {
    correlationId = uuid(),
    durable = true,
    replyTo = false,
  }: AMQPConnectionManagerSendToQueueOptions = {}): Promise<string | MessagePayload> {
    // Ensure there is a connection.
    if (!this.connection) {
      return new Promise((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => this.sendToQueue(queue, payload, {
          correlationId,
          durable,
          replyTo,
        }).then(res => resolve(res)));
      });
    }

    // Ensure message payload is valid.
    if (!isValidMessagePayload(payload)) throw new Error('Invalid message payload provided, it must be a plain object');

    const corrId = uuid();
    const channel = await this.connection.createChannel();
    const { queue: q } = await channel.assertQueue(queue, { durable });

    debug(`Sending to queue "${q}"...`);

    return new Promise((resolve, reject) => {
      if (replyTo === false) {
        channel.close().then(() => resolve());
      }
      else {
        const replyQueue = replyTo === true ? DEFAULT_REPLY_TO_QUEUE : replyTo;

        channel.consume(replyQueue, message => {
          if (!message || (message.properties.correlationId !== corrId)) return;

          debug(`Received response in reply queue for correlation ID ${corrId}`);

          channel.close().then(() => resolve(JSON.parse(message.content as any)));
        }, {
          noAck: true,
        });
      }

      channel.sendToQueue(q, Buffer.from(JSON.stringify(payload)), {
        correlationId: replyTo === false ? undefined : corrId,
        contentType: 'application/json',
        replyTo: replyTo === false ? undefined : (replyTo === true ? DEFAULT_REPLY_TO_QUEUE : replyTo),
        deliveryMode: durable,
      });
    });
  }

  /**
   * Receives a message from a specified queue.
   *
   * @param queue - Name of the queue.
   * @param handler - Handler invoked when the message is received.
   * @param options - @see AMQPConnectionManagerReceiveFromQueueOptions
   */
  async receiveFromQueue(queue: string, handler: (payload?: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    prefetch = 1,
  }: AMQPConnectionManagerReceiveFromQueueOptions = {}): Promise<void> {
    // Ensure there is an active connection.
    if (!this.connection) {
      return new Promise<void>((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => this.receiveFromQueue(queue, handler, {
          ack,
          durable,
          prefetch,
        }).then(() => resolve()));
      });
    }

    debug(`Listening for queue "${queue}"...`);

    const channel = await this.connection.createChannel();
    const { queue: q } = await channel.assertQueue(queue, { durable });

    channel.prefetch(prefetch);

    await channel.consume(q, message => {
      if (!message) {
        debug('No message received');
        return;
      }

      debug('Received message from publisher');

      const payload = JSON.parse(message.content as any);

      if (message.properties.contentType !== 'application/json') {
        throw new Error('The message content type must be of JSON format');
      }

      if (!isValidMessagePayload(payload)) {
        throw new Error('The message content type must be of JSON format');
      }

      handler(payload)
        .then(out => {
          if (message.properties.replyTo) {
            debug('Sending response to publisher...');

            channel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(out || {})), {
              correlationId: message.properties.correlationId,
              contentType: 'application/json',
            });
          }

          if (ack) {
            channel.ack(message);
          }
        })
        .catch(err => {
          debug(`Error occured while handling message: ${err}`);

          if (ack) {
            channel.nack(message, false, false);
          }
        });
    }, {
      noAck: !ack,
    });
  }

  async broadcast(exchange: string, payload: MessagePayload): Promise<string> {
    const corrId = await this.sendToExchange(exchange, payload, {
      correlationId: uuid(),
      durable: true,
      exchangeType: 'fanout',
      key: '',
      replyTo: false,
    });

    if (!is.string(corrId)) throw new Error('Expected return value to be a valid correlation ID');

    return corrId;
  }

  async listen(exchange: string, handler: (payload?: MessagePayload) => Promise<MessagePayload | void>) {
    return this.receiveFromExchange(exchange, async (routingKey, payload) => {
      return handler(payload);
    }, {
      ack: true,
      durable: true,
      exchangeType: 'fanout',
      keys: '',
      prefetch: 1,
    });
  }

  async sendToTopic(exchange: string, topic: string, payload: MessagePayload): Promise<string> {
    const corrId = await this.sendToExchange(exchange, payload, {
      correlationId: uuid(),
      durable: true,
      exchangeType: 'topic',
      key: topic,
      replyTo: false,
    });

    if (!is.string(corrId)) throw new Error('Expected return value to be a valid correlation ID');

    return corrId;
  }

  async listenToTopic(exchange: string, topic: string, handler: (payload?: MessagePayload) => Promise<MessagePayload | void>) {
    return this.receiveFromExchange(exchange, async (routingKey, payload) => {
      return handler(payload);
    }, {
      ack: true,
      durable: true,
      exchangeType: 'topic',
      keys: topic,
      prefetch: 1,
    });
  }

  /**
   * Cleans up the connection instance.
   */
  private async onDisconnect() {
    if (this.connection) {
      this.connection.removeAllListeners();

      try {
        await this.connection.close();
      }
      catch (err) {
        debug(`Failed to close the connection because: ${err}`);
      }

      this.connection = undefined;

      this.emit(AMQPEventType.DISCONNECT);
    }
  }

  /**
   * Pulse for the duration of the heartbeat provided. This basically means
   * wait for a few seconds (whatever the heartbeat is set to).
   */
  private async pulse() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, this.heartbeat * 1000);
    });
  }

  /**
   * Handler invoked when the connection is blocked.
   *
   * @param reason - The reason why the connection is blocked.
   */
  private onConnectionBlocked = (reason: string) => {
    debug(`MQ server blocked the connection because: ${reason}`);

    this.emit(AMQPEventType.BLOCKED, { reason });
  }

  /**
   * Handler invoked when the connection is unblocked.
   */
  private onConnectionUnblocked = () => {
    debug('MQ server has unblocked the connection');

    this.emit(AMQPEventType.UNBLOCKED);
  }

  /**
   * Handler invoked when there is a connection error.
   *
   * @param error - The error.
   */
  private onConnectionError = (error: Error) => {
    debug(`An error occured in the MQ connection: ${error}`);

    this.emit(AMQPEventType.ERROR);

    this.onDisconnect().then(() => this.connect());
  }

  /**
   * Handler invoked when the connection is closed.
   *
   * @param error - The error.
   */
  private onConnectionClose = (error: Error) => {
    debug(`MQ connection closed: ${error}`);

    this.onDisconnect().then(() => this.connect());
  }
}
