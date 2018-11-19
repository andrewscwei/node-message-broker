import assert from 'assert';
import { describe, it } from 'mocha';
import { RPCClient } from '.';
import { AMQPEventType } from './core/AMQPConnectionManager';

describe('amqp-rpc', () => {
  it('can create an RPC client', async () => {
    const client = new RPCClient(process.env.MQ_HOST);

    await new Promise((resolve, reject) => {
      client.on(AMQPEventType.CONNECT, () => {
        resolve();
      });
    });

    assert(client.isConnected());
  });
});
