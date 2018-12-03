import { MessagePayload } from '../types';
import AMQPConnectionManager from './AMQPConnectionManager';

const debug = require('debug')('broker:rpc-server');

export default class RPCServer extends AMQPConnectionManager {
  /**
   * Listens for a published message at the specified queue.
   *
   * @param queue - Queue to listen for incoming message.
   * @param generatePayload - Async function for generating a response payload
   *                          to the publisher.
   */
  async reply(queue: string, processPayload: (payload?: MessagePayload) => Promise<MessagePayload>): Promise<void> {
    return this.receiveFromQueue(queue, processPayload);
  }
}
