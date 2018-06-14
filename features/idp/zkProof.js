const crypto = require('crypto');
const { spawnSync } = require('child_process');
const fs = require('fs');
const config = require('../../config.js');

function genNewKeyPair(sid) {
  const pathSid = config.keyPath + sid;
  const gen = spawnSync('openssl', ['genrsa', '-out', pathSid, '2048']);
  // console.log(gen.stderr.toString());
  const encode = spawnSync('openssl', [
    'rsa',
    '-in',
    pathSid,
    '-pubout',
    '-out',
    `${pathSid}.pub`,
  ]);
  if (gen.status !== 0 || encode.status !== 0) {
    throw new Error('Failed in genNewKeyPair()');
  }
}

function signMessage(messageToSign, privateKeyPath) {
  const result = spawnSync(
    'openssl',
    ['dgst', '-sha256', '-sign', privateKeyPath],
    { input: messageToSign },
  );
  return result.stdout.toString('base64');
}

function accessorSign(sid, text) {
  const privateKey = fs.readFileSync(config.keyPath + sid, 'utf8');
  const encrypted = crypto.privateEncrypt(
    privateKey,
    Buffer.from(text, 'base64'),
  );
  return encrypted.toString('base64');
}

module.exports = {
  genNewKeyPair,
  signMessage,
  accessorSign,
};
