import parseJson from 'parse-json';
import serializeError from 'serialize-error';
import { MessagePayload, typeIsMessagePayload } from '../types';

export default function decodePayload(buffer: Buffer): MessagePayload {
  const str = buffer.toString();
  const obj = parseJson(str);

  if (typeIsMessagePayload(obj)) {
    return obj;
  }
  else {
    return {
      data: null,
      error: serializeError(new Error('Invalid payload format')),
    };
  }
}
