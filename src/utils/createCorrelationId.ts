import uuid from 'uuid/v1';

export default function createCorrelationId(): string {
  return uuid();
}
