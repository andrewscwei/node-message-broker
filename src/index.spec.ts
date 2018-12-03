import is from '@sindresorhus/is';
import assert from 'assert';
import { describe, it } from 'mocha';
import { RPCClient } from '.';
import AMQPConnectionManager from './core/AMQPConnectionManager';
import RPCServer from './core/RPCServer';
import { AMQPEventType } from './enums';
import { RPCPayload } from './types';

describe('broker', () => {
  it('can create a new AMQPConnectionManager instance that auto connects to a MQ server', async () => {
    const manager = new AMQPConnectionManager(process.env.MQ_HOST);

    await new Promise((resolve, reject) => {
      manager.on(AMQPEventType.CONNECT, () => resolve());
    });

    assert(manager.isConnected());
  });

  it('auto reconnects to the MQ server after it is disconnected', async () => {
    const manager = new AMQPConnectionManager(process.env.MQ_HOST);
    await manager.connect();

    assert(manager.isConnected());

    await manager.disconnect();

    assert(!manager.isConnected());

    await new Promise((resolve, reject) => {
      manager.once(AMQPEventType.CONNECT, () => resolve());
    });

    assert(manager.isConnected());
  });

  it('can instantiate an RPCClient instance', async () => {
    const client = new RPCClient(process.env.MQ_HOST);

    await new Promise((resolve, reject) => {
      client.on(AMQPEventType.CONNECT, () => resolve());
    });

    assert(client.isConnected());
  });

  it('can instantiate an RPCServer instance', async () => {
    const server = new RPCServer(process.env.MQ_HOST);

    await new Promise((resolve, reject) => {
      server.on(AMQPEventType.CONNECT, () => resolve());
    });

    assert(server.isConnected());
  });

  it('can pub/sub', async () => {
    const client = new RPCClient(process.env.MQ_HOST);
    const server = new RPCServer(process.env.MQ_HOST);

    server.reply('test-queue', async (payload?: RPCPayload) => {
      if (is.nullOrUndefined(payload)) throw new Error('No payload provided');
      assert(payload.foo === 'foo');

      return {
        foo: 'bar',
      };
    });

    const res: any = await client.request('test-queue', { foo: 'foo' });

    assert(res.foo === 'bar');
  });
});
