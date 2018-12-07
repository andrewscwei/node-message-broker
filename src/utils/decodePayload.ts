import is from '@sindresorhus/is';
import { ObjectID } from 'bson';
import { MessagePayload } from '../types';

function mapValuesToObjectID(obj: { [key: string]: any }) {
  for (const k in obj) {
    if (!obj.hasOwnProperty(k)) continue;

    const val = obj[k];

    if (is.array(val)) {
      obj[k] = val.map(v => mapValuesToObjectID(v));
    }
    else if (is.plainObject(val)) {
      obj[k] = mapValuesToObjectID(val);
    }
    else if (isValidObjectID(val)) {
      // obj[k] = new ObjectID(val);
    }
  }

  return obj;
}

function isValidObjectID(val: any) {
  try {
    if (val instanceof ObjectID) return true;
    if (!ObjectID.isValid(val)) return false;

    const objectId = new ObjectID(val);

    if (objectId.toHexString() !== String(val)) return false;

    return true;
  }
  catch (err) {
    return false;
  }
}

export default function decodePayload(buffer: Buffer): MessagePayload {
  const str = buffer.toString();
  const obj = JSON.parse(str);

  return mapValuesToObjectID(obj);
}
