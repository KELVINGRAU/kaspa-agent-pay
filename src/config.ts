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
