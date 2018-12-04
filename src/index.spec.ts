import is from '@sindresorhus/is';
import assert from 'assert';
import { describe, it } from 'mocha';
import AMQPConnectionManager from './core/AMQPConnectionManager';
import { AMQPEventType } from './enums';
import { MessagePayload } from './types';

describe('message-broker', () => {
  it('can create a new AMQPConnectionManager instance that auto connects to a MQ server', async () => {
    const manager = new AMQPConnectionManager();

    await new Promise((resolve, reject) => {
      manager.on(AMQPEventType.CONNECT, () => resolve());
    });

    assert(manager.isConnected());
  });

  it('auto reconnects to the MQ server after it is disconnected', async () => {
    const manager = new AMQPConnectionManager();
    await manager.connect();

    assert(manager.isConnected());

    await manager.disconnect();

    assert(!manager.isConnected());

    await new Promise((resolve, reject) => {
      manager.once(AMQPEventType.CONNECT, () => resolve());
    });

    assert(manager.isConnected());
  });

  it('can pub/sub via RPC', async () => {
    const client = new AMQPConnectionManager();
    const server = new AMQPConnectionManager();

    server.receiveFromQueue('test-queue', async (payload?: MessagePayload) => {
      if (is.nullOrUndefined(payload)) throw new Error('No payload provided');
      assert(payload.foo === 'foo');

      return {
        foo: 'bar',
      };
    });

    const res: any = await client.sendToQueue('test-queue', {
      foo: 'foo',
    }, {
      replyTo: true,
    });

    assert(res.foo === 'bar');
  });

  it('can broadcast to an exchange', done => {
    const exchangeName = 'fanout';
    const broadcaster = new AMQPConnectionManager();
    const consumer1 = new AMQPConnectionManager();
    const consumer2 = new AMQPConnectionManager();
    const consumer3 = new AMQPConnectionManager();
    const consumer4 = new AMQPConnectionManager();

    let i = 0;

    const handler = async (payload?: MessagePayload) => {
      assert(payload && payload.foo === 'foo');

      i++;

      if (i === 4) done();
    };

    Promise.all([
      consumer1.listen(exchangeName, handler),
      consumer2.listen(exchangeName, handler),
      consumer3.listen(exchangeName, handler),
      consumer4.listen(exchangeName, handler),
    ])
      .then(() => {
        broadcaster.broadcast(exchangeName, {
          foo: 'foo',
        });
      });
  });

  it('can send a message to a topic', done => {
    const exchangeName = 'topic';
    const topic = 'foo.bar.baz';
    const publisher = new AMQPConnectionManager();
    const consumer = new AMQPConnectionManager();

    consumer.listenToTopic(exchangeName, '*.*.baz', async payload => {
      assert(payload && payload.foo === 'foo');
      done();
    })
      .then(() => {
        publisher.sendToTopic(exchangeName, topic, {
          foo: 'foo',
        });
      });
  });
});
