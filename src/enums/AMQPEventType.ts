enum AMQPEventType {
  /**
   * A conection to the message queue broker server is successfully established.
   */
  CONNECT = 'connect',

  /**
   * A connection is terminated from the message queue broker server.
   */
  DISCONNECT = 'disconnect',

  /**
   * A connection attempt is blocked by the message queue broker server.
   */
  BLOCKED = 'blocked',

  /**
   * A blocked connection attempt is unblocked by the message queue broker
   * server.
   */
  UNBLOCKED = 'unblocked',

  /**
   * An error has occurred while connecting to or during the connection of the
   * message queue broker server.
   */
  ERROR = 'error',
}

export default AMQPEventType;
