import { readFileSync } from "node:fs";

// Minimal .env loader (no dependency): lets scripts and the MCP server pick
// up KASPA_* settings from a .env file in the working directory. Real
// environment variables always win over .env entries.
try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
} catch {
  // No .env file -- rely on real environment variables.
}

export type NetworkId = "mainnet" | "testnet-10" | "testnet-11";

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

const networkId = (process.env.KASPA_NETWORK ?? "testnet-10") as NetworkId;
const allowMainnet = parseBool(process.env.KASPA_ALLOW_MAINNET, false);

if (networkId === "mainnet" && !allowMainnet) {
  throw new Error(
    "KASPA_NETWORK=mainnet requires KASPA_ALLOW_MAINNET=true as an explicit safety confirmation. " +
      "Refusing to start an agent-controlled wallet against mainnet by default."
  );
}

export const config = {
  networkId,
  // Optional wRPC endpoint of a specific Kaspa node. When unset, the SDK's
  // Resolver discovers a community-operated public node automatically.
  nodeUrl: process.env.KASPA_NODE_URL,
  privateKeyHex: process.env.KASPA_PRIVATE_KEY_HEX,
  maxSendKas: Number(process.env.KASPA_MAX_SEND_KAS ?? "50"),
};
