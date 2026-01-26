import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(env.ENCRYPTION_KEY, salt, KEY_LENGTH);
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag: string;
}

export function encrypt(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  const data: EncryptedData = {
    encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    tag: tag.toString('hex'),
  };

  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decrypt(encryptedString: string): string {
  const data = JSON.parse(Buffer.from(encryptedString, 'base64').toString('utf8')) as EncryptedData;

  const salt = Buffer.from(data.salt, 'hex');
  const key = deriveKey(salt);
  const iv = Buffer.from(data.iv, 'hex');
  const tag = Buffer.from(data.tag, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const data = JSON.parse(decoded) as unknown;

    return (
      typeof data === 'object' &&
      data !== null &&
      'encrypted' in data &&
      'iv' in data &&
      'salt' in data &&
      'tag' in data
    );
  } catch {
    return false;
  }
}
