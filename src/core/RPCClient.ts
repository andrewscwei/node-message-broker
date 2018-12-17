import { MessagePayload, MessagePayloadMake, typeIsMessagePayload } from '../types';
import { createCorrelationId } from '../utils';
import AMQPConnectionManager, { AMQPConnectionManagerSendToDirectExchangeOptions, AMQPConnectionManagerSendToExchangeOptions, AMQPConnectionManagerSendToQueueOptions, AMQPConnectionManagerSendToTopicOptions } from './AMQPConnectionManager';

export default class RPCClient extends AMQPConnectionManager {
  /**
   * @inheritdoc
   */
  async sendToQueue(queue: string, payload: MessagePayload, {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = true,
  }: AMQPConnectionManagerSendToQueueOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToQueue(queue, payload, {
      correlationId,
      durable,
      replyTo,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }

  /**
   * @inheritdoc
   */
  async sendToExchange(exchange: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    exchangeType = 'fanout',
    key = '',
    replyTo = true,
  }: AMQPConnectionManagerSendToExchangeOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToExchange(exchange, payload, {
      correlationId,
      durable,
      exchangeType,
      key,
      replyTo,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }

  /**
   * @inheritdoc
   */
  async sendToDirectExchange(exchange: string, key: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = true,
  }: AMQPConnectionManagerSendToDirectExchangeOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToDirectExchange(exchange, key, payload, {
      correlationId,
      durable,
      replyTo,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }

  /**
   * @inheritdoc
   */
  async sendToTopic(exchange: string, topic: string, payload: MessagePayload = MessagePayloadMake(), {
    correlationId = createCorrelationId(),
    durable = true,
    replyTo = true,
  }: AMQPConnectionManagerSendToTopicOptions = {}): Promise<MessagePayload> {
    const res = await super.sendToTopic(exchange, topic, payload, {
      correlationId,
      durable,
      replyTo,
    });

    if (!typeIsMessagePayload(res)) throw new Error('Invalid payload format');

    return res;
  }
}
