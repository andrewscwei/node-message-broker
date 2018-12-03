import is from '@sindresorhus/is';
import amqplib, { Connection } from 'amqplib';
import { EventEmitter } from 'events';
import uuid from 'uuid/v1';
import { AMQPEventType, RPCQueueType } from '../enums';
import { isValidMessagePayload, MessagePayload } from '../types';

const debug = require('debug')('broker');

export interface AMQPConnectionManagerOptions {
  /**
   * Time in seconds to wait before attempting to auto-reconnect whenever the
   * connection is lost. Specify 0 to never auto-reconnect.
   */
  heartbeat?: number;
}

export interface AMQPConnectionManagerSendOptions {
  /**
   * Indicates the name of the queue of which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue with a correlation ID. If set to `false`, no
   * reply is expected from the consumer.
   */
  replyTo?: string | boolean;

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable and the message that is sent will be marked as
   * persistent, i.e. setting `deliveryMode` to `true`.
   */
  durable?: boolean;
}

export interface AMQPConnectionManagerReceiveOptions {
  /**
   * Indicates the name of the queue of which the publisher is expecting a
   * reply. Provide the name of the queue or simply set this to `true` to use
   * the default reply-to queue with a correlation ID. If set to `false`, no
   * reply is expected from the consumer.
   */
  replyTo?: string | boolean;

  /**
   * Indicates whether the sent message should be acknowledged when consumed.
   */
  ack?: boolean;

  /**
   * Indicates whether the message should be preserved in the case that the
   * publisher dies. If this is `true`, the queue which the message is sent to
   * will be marked as durable.
   */
  durable?: boolean;

  /**
   * Determines how many messages this instance can receive on the same queue
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
   * broker.
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

  async sendToQueue(queue: string, payload: MessagePayload, { durable = true, replyTo = false }: AMQPConnectionManagerSendOptions = {}): Promise<void | MessagePayload> {
    // Ensure there is a connection.
    if (!this.connection) {
      return new Promise((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => {
          this.sendToQueue(queue, payload, { durable, replyTo })
            .then(message => resolve(message || undefined))
            .catch(error => reject(error));
        });
      });
    }

    // Ensure message payload is valid.
    if (!isValidMessagePayload(payload)) {
      throw new Error('Invalid message payload provided, it must be a plain object');
    }

    const corrId = uuid();

    const channel = await this.connection.createChannel().catch(error => {
      throw error;
    });

    const { queue: q } = await channel.assertQueue(queue, { durable }).catch(error => {
      throw error;
    });

    debug(`Sending to queue "${q}"...`);

    return new Promise((resolve, reject) => {
      if (replyTo === false) {
        channel.close().then(() => resolve());
      }
      else {
        const replyQueue = replyTo === true ? RPCQueueType.DEFAULT_REPLY_TO : replyTo;

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
        replyTo: replyTo === false ? undefined : RPCQueueType.DEFAULT_REPLY_TO,
        deliveryMode: true,
      });
    });
  }

  async receiveFromQueue(queue: string, handler: (payload?: MessagePayload) => Promise<MessagePayload | void>, { ack = true, durable = true, prefetch = 1, replyTo = false }: AMQPConnectionManagerReceiveOptions = {}): Promise<void> {
    // Ensure there is an active connection.
    if (!this.connection) {
      return new Promise<void>((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => {
          this.receiveFromQueue(queue, handler, { durable, prefetch, replyTo })
            .then(() => resolve())
            .catch(error => reject(error));
        });
      });
    }

    debug(`Listening for queue "${queue}"...`);

    const channel = await this.connection.createChannel().catch(error => {
      throw error;
    });

    const { queue: q } = await channel.assertQueue(queue, { durable }).catch(error => {
      throw error;
    });

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

      // Generate the payload. Note that the payload is either a JSON object
      // or a buffer. Handle both and let the publisher know which format it
      // is.
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
    }).catch(error => {
      throw error;
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
