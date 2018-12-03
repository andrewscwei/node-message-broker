import { MessagePayload } from '../types';
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
  async request(queue: string, payload: MessagePayload): Promise<void | MessagePayload> {
    return this.send(payload, { queue, replyTo: true });
  }
}
