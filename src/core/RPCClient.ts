import { ConsumeMessage } from 'amqplib';
import { EventEmitter } from 'events';
import { AMQPEventType } from '../enums';
import { isValidRPCPayload, RPCPayload } from '../types';
import randomCorrelationId from '../utils/randomCorrelationId';
import AMQPConnectionManager, { REPLY_QUEUE } from './AMQPConnectionManager';

const debug = require('debug')('rpc:client');

export default class RPCClient extends AMQPConnectionManager {
  /**
   * Publishes a message to the specified queue with the provided payload.
   *
   * @param queue - Name of queue to publish to.
   * @param payload - Payload buffer.
   *
   * @returns The response from the consumer.
   */
  async request(queue: string, payload: RPCPayload): Promise<object | Buffer> {
    if (!this.connection) {
      return new Promise((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => {
          this.request(queue, payload)
            .then(message => resolve(message))
            .catch(error => reject(error));
        });
      });
    }

    if (!isValidRPCPayload(payload)) {
      throw new Error('Invalid payload provided, it must be a plain object');
    }

    debug(`Publishing to queue "${queue}"...`);

    const channel = await this.connection.createChannel();
    const eventEmitter = new EventEmitter();
    const id = randomCorrelationId();

    channel.consume(REPLY_QUEUE, message => {
      if (message) {
        eventEmitter.emit(message.properties.correlationId, message);
      }
      else {
        throw new Error('No message in reply');
      }
    }, {
      noAck: true,
    });

    await channel.assertQueue(queue);

    return new Promise((resolve, reject) => {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
        correlationId: id,
        contentType: 'application/json',
        replyTo: REPLY_QUEUE,
      });

      eventEmitter.once(id, (message: ConsumeMessage) => {
        debug('Received response in reply queue');

        resolve(JSON.parse(message.content as any));
      });
    });
  }
}
