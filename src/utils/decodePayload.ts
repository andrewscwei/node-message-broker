import { MessagePayload } from '../types';

export default function decodePayload(buffer: Buffer): MessagePayload {
  const str = buffer.toString();
  const obj = JSON.parse(str);
  return obj;
}
