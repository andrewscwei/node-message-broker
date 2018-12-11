import parseJson from 'parse-json';
import { ErrorPayload, MessagePayload } from '../types';

export default function decodePayload(buffer: Buffer): MessagePayload | ErrorPayload {
  const str = buffer.toString();
  const obj = parseJson(str);
  return obj;
}
