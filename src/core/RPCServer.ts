import { AMQPEventType } from '../enums';
import { isValidMessagePayload, MessagePayload } from '../types';
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
    // Ensure there is an active connection.
    if (!this.connection) {
      this.once(AMQPEventType.CONNECT, () => {
        this.reply(queue, processPayload);
      });

      return;
    }

    debug(`Listening for queue "${queue}"...`);

    const channel = await this.connection.createChannel();

    await channel.assertQueue(queue);

    channel.prefetch(1);
    channel.consume(queue, message => {
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
      processPayload(payload)
        .then(out => {
          debug('Sending response to publisher...');

          channel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(out)), {
            correlationId: message.properties.correlationId,
            contentType: 'application/json',
          });

          channel.ack(message);
        })
        .catch(err => {
          debug(`Error occured while preparing payload: ${err}`);
          channel.nack(message, false, false);
        });
    });
  }
}
