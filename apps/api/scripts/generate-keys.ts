// Prints a fresh RS256 key pair, base64-encoded so each PEM fits on one .env line.
import { generateKeyPairSync } from 'node:crypto';

const MODULUS_LENGTH = 2048;

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: MODULUS_LENGTH,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const encode = (pem: string) => Buffer.from(pem, 'utf8').toString('base64');

process.stdout.write(
  [
    '# --- apps/api/.env ------------------------------------------------',
    '# The private key signs. Keep it here and nowhere else.',
    `JWT_PRIVATE_KEY=${encode(privateKey)}`,
    `JWT_PUBLIC_KEY=${encode(publicKey)}`,
    '',
    '# Anything that only verifies tokens gets the public key, never the private one.',
    '# Rotating these signs every existing session out. That is the intent.',
    '',
  ].join('\n'),
);
