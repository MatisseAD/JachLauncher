import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateDer = privateKey.export({ format: "der", type: "pkcs8" });
const publicDer = publicKey.export({ format: "der", type: "spki" });

console.log(`MANIFEST_SIGNING_PRIVATE_KEY=${privateDer.toString("base64")}`);
console.log(`Public key (information): ${publicDer.toString("base64")}`);
