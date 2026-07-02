import "../src/ws-polyfill.js";
import { RpcClient, Encoding } from "kaspa-wasm";

const networkId = process.env.KASPA_NETWORK ?? "testnet-10";
const nodeUrl = process.env.KASPA_NODE_URL;

if (!nodeUrl) {
  console.error(`KASPA_NODE_URL is not set. Point it at a Kaspa wRPC endpoint for ${networkId} and retry.`);
  process.exit(1);
}

const rpc = new RpcClient(nodeUrl, Encoding.Borsh, networkId);

console.log(`Connecting to Kaspa ${networkId} at ${nodeUrl}...`);
await rpc.connect({});
const info = await rpc.getInfo();
console.log("Connected. Node info:", info);
await rpc.disconnect();
console.log("RPC connectivity OK.");
