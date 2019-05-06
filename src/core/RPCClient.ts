import { MessagePayload, MessagePayloadMake, typeIsMessagePayload } from '../types';
import { createCorrelationId } from '../utils';
import AMQPConnectionManager, { AMQPConnectionManagerSendToDirectExchangeOptions, AMQPConnectionManagerSendToExchangeOptions, AMQPConnectionManagerSendToQueueOptions, AMQPConnectionManagerSendToTopicOptions } from './AMQPConnectionManager';

export default class RPCClient extends AMQPConnectionManager {
  /**
   * @inheritdoc
   *
   * @throws {Error} Invalid payload.
   */
  async sendToQueue(queue: string, payload: MessagePayload, {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = true,
    timeout = 0,
  }: AMQPConnectionManagerSendToQueueOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToQueue(queue, payload, {
      correlationId,
      durable,
      replyTo,
      timeout,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }

  /**
   * @inheritdoc
   *
   * @throws {Error} Invalid payload.
   */
  async sendToExchange(exchange: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    exchangeType = 'fanout',
    key = '',
    replyTo = true,
    timeout = 0,
  }: AMQPConnectionManagerSendToExchangeOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToExchange(exchange, payload, {
      correlationId,
      durable,
      exchangeType,
      key,
      replyTo,
      timeout,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }

  /**
   * @inheritdoc
   *
   * @throws {Error} Invalid payload.
   */
  async sendToDirectExchange(exchange: string, key: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = true,
    timeout = 0,
  }: AMQPConnectionManagerSendToDirectExchangeOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToDirectExchange(exchange, key, payload, {
      correlationId,
      durable,
      replyTo,
      timeout,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }

  /**
   * @inheritdoc
   *
   * @throws {Error} Invalid payload.
   */
  async sendToTopic(exchange: string, topic: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = true,
    timeout = 0,
  }: AMQPConnectionManagerSendToTopicOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToTopic(exchange, topic, payload, {
      correlationId,
      durable,
      replyTo,
      timeout,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }
}
