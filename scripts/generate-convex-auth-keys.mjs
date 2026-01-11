import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK, exportPKCS8 } from "jose";

const outDir = ".secrets/convex-auth";
mkdirSync(outDir, { recursive: true });

const kid = randomUUID();
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwtPrivateKey = await exportPKCS8(privateKey);
const jwk = await exportJWK(publicKey);

const jwks = JSON.stringify({
  keys: [
    {
      ...jwk,
      kid,
      use: "sig",
      alg: "RS256",
    },
  ],
});

writeFileSync(`${outDir}/jwt_private_key.pem`, jwtPrivateKey, "utf8");
writeFileSync(`${outDir}/jwks.json`, jwks, "utf8");

process.stdout.write(
  [
    `Wrote ${outDir}/jwt_private_key.pem`,
    `Wrote ${outDir}/jwks.json`,
    "",
    "Next steps (PowerShell):",
    `$jwt = Get-Content -Raw ${outDir}/jwt_private_key.pem`,
    `$jwks = Get-Content -Raw ${outDir}/jwks.json`,
    "npx convex env set JWT_PRIVATE_KEY $jwt",
    "npx convex env set JWKS $jwks",
  ].join("\n"),
);

