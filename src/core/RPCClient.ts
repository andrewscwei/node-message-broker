import uuid from 'uuid';
import { AMQPEventType, RPCQueueType } from '../enums';
import { isValidMessagePayload, MessagePayload } from '../types';
import AMQPConnectionManager from './AMQPConnectionManager';

const debug = require('debug')('broker:rpc-client');

export default class RPCClient extends AMQPConnectionManager {
  /**
   * Publishes a message to the specified queue with the provided payload.
   *
   * @param queue - Name of queue to publish to.
   * @param payload - Payload buffer.
   *
   * @returns The response from the consumer.
   */
  async request(queue: string, payload: MessagePayload): Promise<object | Buffer> {
    // Ensure there is a connection.
    if (!this.connection) {
      return new Promise((resolve, reject) => {
        this.once(AMQPEventType.CONNECT, () => {
          this.request(queue, payload)
            .then(message => resolve(message))
            .catch(error => reject(error));
        });
      });
    }

    // Ensure message payload is valid.
    if (!isValidMessagePayload(payload)) {
      throw new Error('Invalid message payload provided, it must be a plain object');
    }

    debug(`Publishing to queue "${queue}"...`);

    const channel = await this.connection.createChannel();
    const corrId = uuid();

    await channel.assertQueue(queue);

    return new Promise((resolve, reject) => {
      channel.consume(RPCQueueType.DEFAULT_REPLY_TO, message => {
        if (!message || message.properties.correlationId !== corrId) return;

        debug(`Received response in reply queue for correlation ID ${corrId}`);

        resolve(JSON.parse(message.content as any));
      }, {
        noAck: true,
      });

      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
        correlationId: corrId,
        contentType: 'application/json',
        replyTo: RPCQueueType.DEFAULT_REPLY_TO,
      });
    });
  }
}
