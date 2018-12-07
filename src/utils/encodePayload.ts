import is from '@sindresorhus/is';
import { ObjectID } from 'bson';
import { MessagePayload } from '../types';

function mapObjectIDsToString(obj: { [key: string]: any }) {
  for (const k in obj) {
    if (!obj.hasOwnProperty(k)) continue;

    const val = obj[k];

    if (is.array(val)) {
      obj[k] = val.map(v => mapObjectIDsToString(v));
    }
    else if (is.plainObject(val)) {
      obj[k] = mapObjectIDsToString(val);
    }
    else if (val instanceof ObjectID) {
      obj[k] = val.toHexString();
    }
  }

  return obj;
}

export default function encodePayload(payload: MessagePayload): Buffer {
  const obj = mapObjectIDsToString(payload);
  const str = JSON.stringify(obj);
  return Buffer.from(str);
}
