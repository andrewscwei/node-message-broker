enum RPCQueueType {
  /**
   * Default pseudo-queue for RPC clients to request from and reply to.
   */
  DEFAULT_REPLY_TO = 'amq.rabbitmq.reply-to',
  PROCESS_SYGNL_ATTACHMENT = 'sygnl.process-attachment',
}

export default RPCQueueType;
