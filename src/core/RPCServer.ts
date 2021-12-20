import { Channel } from 'amqplib'
import { MessagePayload } from '../types'
import AMQPConnectionManager, { AMQPConnectionManagerReceiveFromDirectExchangeOptions, AMQPConnectionManagerReceiveFromExchangeOptions, AMQPConnectionManagerReceiveFromQueueOptions, AMQPConnectionManagerReceiveFromTopicOptions } from './AMQPConnectionManager'

export default class RPCServer extends AMQPConnectionManager {

  /**
   * @inheritdoc
   */
  async receiveFromQueue(queue: string, handler: (payload: MessagePayload) => Promise<MessagePayload>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromQueueOptions = {}): Promise<Channel> {
    return super.receiveFromQueue(queue, handler, {
      ack,
      durable,
      prefetch,
      autoCloseChannel,
    })
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
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromExchangeOptions = {}): Promise<Channel> {
    return super.receiveFromExchange(exchange, handler, {
      ack,
      durable,
      exchangeType,
      keys,
      prefetch,
      autoCloseChannel,
    })
  }

  /**
   * @inheritdoc
   */
  async receiveFromDirectExchange(exchange: string, key: string, handler: (payload: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromDirectExchangeOptions = {}): Promise<Channel> {
    return super.receiveFromDirectExchange(exchange, key, handler, {
      ack,
      durable,
      prefetch,
      autoCloseChannel,
    })
  }

  /**
   * @inheritdoc
   */
  async receiveFromTopic(exchange: string, topic: string | string[], handler: (routingKey: string, payload: MessagePayload) => Promise<MessagePayload | void>, {
    ack = true,
    durable = true,
    prefetch = 0,
    autoCloseChannel = false,
  }: AMQPConnectionManagerReceiveFromTopicOptions = {}): Promise<Channel> {
    return super.receiveFromTopic(exchange, topic, handler, {
      ack,
      durable,
      prefetch,
      autoCloseChannel,
    })
  }
}
