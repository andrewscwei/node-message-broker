import assert from 'assert';
import { describe, it } from 'mocha';
import AMQPConnectionManager from './core/AMQPConnectionManager';
import { AMQPEventType } from './enums';
import { MessagePayload } from './types';

describe('message-broker', () => {
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

  it('can pub/sub via RPC', async () => {
    const client = new AMQPConnectionManager(process.env.MQ_HOST);
    const server = new AMQPConnectionManager(process.env.MQ_HOST);

    server.receiveRPC('test-queue-success', async payload => {
      assert(payload.data === 'foo');

      return {
        data: 'bar',
      };
    });

    const res = await client.sendRPC('test-queue-success', {
      data: 'foo',
    });

    assert(res.data === 'bar');
  });

  it('publisher is notified when there is an error on the consumer\'s side', async () => {
    const client = new AMQPConnectionManager(process.env.MQ_HOST);
    const server = new AMQPConnectionManager(process.env.MQ_HOST);

    server.receiveRPC('test-queue-fail', async payload => {
      throw new TypeError('Automated error');
    });

    const res: any = await client.sendRPC('test-queue-fail', {
      data: 'foo',
    });

    assert(res.error);
  });

  it('can broadcast to an exchange', done => {
    const exchangeName = 'fanout';
    const broadcaster = new AMQPConnectionManager(process.env.MQ_HOST);
    const consumer1 = new AMQPConnectionManager(process.env.MQ_HOST);
    const consumer2 = new AMQPConnectionManager(process.env.MQ_HOST);
    const consumer3 = new AMQPConnectionManager(process.env.MQ_HOST);
    const consumer4 = new AMQPConnectionManager(process.env.MQ_HOST);

    let i = 0;

    const handler = async (payload: MessagePayload) => {
      assert(payload.data === 'foo');

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
          data: 'foo',
        });
      });
  });

  it('can send a message to a topic', done => {
    const exchangeName = 'topic';
    const topic = 'foo.bar.baz';
    const publisher = new AMQPConnectionManager(process.env.MQ_HOST);
    const consumer = new AMQPConnectionManager(process.env.MQ_HOST);

    consumer.listenForTopic(exchangeName, '*.*.baz', async (routingKey, payload) => {
      assert(payload.data === 'foo');
      done();
    })
      .then(() => {
        publisher.sendToTopic(exchangeName, topic, {
          data: 'foo',
        });
      });
  });
});
