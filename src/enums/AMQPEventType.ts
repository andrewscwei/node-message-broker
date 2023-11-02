export enum AMQPEventType {
  /**
   * A conection to the message queue message-broker server is successfully
   * established.
   */
  CONNECT = 'connect',

  /**
   * A connection is terminated from the message queue message-broker server.
   */
  DISCONNECT = 'disconnect',

  /**
   * A connection attempt is blocked by the message queue message-broker server.
   */
  BLOCKED = 'blocked',

  /**
   * A blocked connection attempt is unblocked by the message queue
   * message-broker server.
   */
  UNBLOCKED = 'unblocked',

  /**
   * An error has occurred while connecting to or during the connection of the
   * message queue message-broker server.
   */
  ERROR = 'error',
}
