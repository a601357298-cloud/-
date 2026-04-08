import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node worker/scripts/hash-password.mjs <password>");
  process.exit(1);
}

const iterations = 100000;
const salt = randomBytes(16);
const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const encoded = `pbkdf2$${iterations}$${salt.toString("base64")}$${derived.toString("base64")}`;

console.log(encoded);
