import { ErrorPayload, MessagePayload } from '../types';

export default function encodePayload(payload: MessagePayload | ErrorPayload): Buffer {
  return Buffer.from(JSON.stringify(payload));
}
