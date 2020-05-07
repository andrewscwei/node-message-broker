import { v1 as uuid } from 'uuid';

export default function createCorrelationId(): string {
  return uuid();
}
