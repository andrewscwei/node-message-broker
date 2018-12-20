import { Channel } from 'amqplib';
import { MessagePayload } from '../types';
import AMQPConnectionManager, { AMQPConnectionManagerReceiveFromDirectExchangeOptions, AMQPConnectionManagerReceiveFromExchangeOptions, AMQPConnectionManagerReceiveFromQueueOptions, AMQPConnectionManagerReceiveFromTopicOptions } from './AMQPConnectionManager';

export default class RPCServer extends AMQPConnectionManager {
  /**
   * @inheritdoc
   */
  async receiveFromQueue(queue: string, handler: (payload: MessagePayload) => Promise<MessagePayload>, {
    ack = true,
    durable = true,
    prefetch = 0,
  }: AMQPConnectionManagerReceiveFromQueueOptions = {}): Promise<Channel> {
    return super.receiveFromQueue(queue, handler, {
      ack,
      durable,
      prefetch,
    });
  }

  /**
   * @inheritdoc
   */
  async receiveFromExchange(exchange: string, handler: (routingKey: string, payload: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    exchangeType = 'fanout',
    keys = '',
    prefetch = 0,
  }: AMQPConnectionManagerReceiveFromExchangeOptions = {}): Promise<Channel> {
    return super.receiveFromExchange(exchange, handler, {
      ack,
      durable,
      exchangeType,
      keys,
      prefetch,
    });
  }

  /**
   * @inheritdoc
   */
  async receiveFromDirectExchange(exchange: string, key: string, handler: (payload: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    prefetch = 0,
  }: AMQPConnectionManagerReceiveFromDirectExchangeOptions = {}): Promise<Channel> {
    return super.receiveFromDirectExchange(exchange, key, handler, {
      ack,
      durable,
      prefetch,
    });
  }

  /**
   * @inheritdoc
   */
  async receiveFromTopic(exchange: string, topic: string | string[], handler: (routingKey: string, payload: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    prefetch = 0,
  }: AMQPConnectionManagerReceiveFromTopicOptions = {}): Promise<Channel> {
    return super.receiveFromTopic(exchange, topic, handler, {
      ack,
      durable,
      prefetch,
    });
  }
}
