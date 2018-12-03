import is from '@sindresorhus/is';
import amqplib, { Connection } from 'amqplib';
import { EventEmitter } from 'events';
import { AMQPEventType } from '../enums';

const debug = require('debug')('rpc');

/**
 * Default pseudo-queue for RPC clients to request from and reply to.
 */
export const REPLY_QUEUE: string = 'amq.rabbitmq.reply-to';

export interface AMQPConnectionManagerOptions {
  /**
   * Time in seconds to wait before attempting to auto-reconnect whenever the
   * connection is lost. Specify 0 to never auto-reconnect.
   */
  heartbeat?: number;
}

export default class AMQPConnectionManager extends EventEmitter {
  protected connection?: Connection;
  protected isConnecting: boolean = false;
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

    debug(`Connecting to ${this.url}...`);

    this.isConnecting = true;

    try {
      this.connection = await amqplib.connect(this.url);

      debug('Connected successfully');

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
