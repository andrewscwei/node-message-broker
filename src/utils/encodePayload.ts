import { MessagePayload } from '../types';

export default function encodePayload(payload: MessagePayload): Buffer {
  const str = JSON.stringify(payload);
  return Buffer.from(str);
}
