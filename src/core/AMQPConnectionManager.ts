import is from '@sindresorhus/is';
import amqplib, { Connection } from 'amqplib';
import { EventEmitter } from 'events';

const debug = require('debug')('amqp-rpc');

/**
 * Default pseudo-queue for RPC clients to request from and reply to.
 */
export const REPLY_QUEUE: string = 'amq.rabbitmq.reply-to';

export enum AMQPEventType {
  /**
   * A conection to the message queue broker server is successfully established.
   */
  CONNECT = 'connect',

  /**
   * A connection is terminated from the message queue broker server.
   */
  DISCONNECT = 'disconnect',

  /**
   * A connection attempt is blocked by the message queue broker server.
   */
  BLOCKED = 'blocked',

  /**
   * A blocked connection attempt is unblocked by the message queue broker
   * server.
   */
  UNBLOCKED = 'unblocked',

  /**
   * An error has occurred while connecting to or during the connection of the
   * message queue broker server.
   */
  ERROR = 'error',
}

export type AMQPConnectionPayload = Readonly<{
  [key: string]: any;
}>;

export interface AMQPConnectionManagerOptions {
  /**
   * Time in seconds to wait before attempting to auto-reconnect whenever the
   * connection is lost. Specify 0 to never auto-reconnect.
   */
  heartbeat?: number;
}

export default class AMQPConnectionManager extends EventEmitter {
  protected connection?: Connection;
  private heartbeat: number = 3;
  private url: string = 'amqp://localhost:5672';

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

    debug('Instantiating a new AMQPConnectionManager');

    // Attempt to connect right away.
    this.connect();
  }

  /**
   * Validates that a given value is a valid payload.
   *
   * @param payload
   *
   * @returns `true` if valid, `false` otherwise.
   */
  isValidPayload(payload: any): payload is AMQPConnectionPayload {
    if (!is.plainObject(payload)) return false;
    return true;
  }

  /**
   * Connect to the message queue server.
   *
   * @returns The connection instance.
   */
  private async connect(): Promise<Connection> {
    if (this.connection) return this.connection;

    debug(`Connecting to ${this.url}...`);

    try {
      this.connection = await amqplib.connect(this.url);

      debug('Connected successfully');

      this.emit(AMQPEventType.CONNECT);

      this.connection.on('blocked', this.onConnectionBlocked);
      this.connection.on('unblocked', this.onConnectionUnblocked);
      this.connection.on('close', this.onConnectionClose);
      this.connection.on('error', this.onConnectionError);

      return this.connection;
    }
    catch (err) {
      debug(`Unable to connect to ${this.url}, retrying in ${this.heartbeat}s`);

      await this.pulse();
      return this.connect();
    }
  }

  /**
   * Disconnect from the message queue server (if a connection already exists).
   */
  private async disconnect() {
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

    this.disconnect().then(() => this.connect());
  }

  /**
   * Handler invoked when the connection is closed.
   *
   * @param error - The error.
   */
  private onConnectionClose = (error: Error) => {
    debug(`MQ connection closed: ${error}`);

    this.disconnect().then(() => this.connect());
  }
}
