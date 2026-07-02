import "../src/ws-polyfill.js";
import { RpcClient, Resolver, Encoding } from "kaspa-wasm32-sdk";

const networkId = process.env.KASPA_NETWORK ?? "testnet-10";
const nodeUrl = process.env.KASPA_NODE_URL;

const rpc = new RpcClient({
  ...(nodeUrl ? { url: nodeUrl } : { resolver: new Resolver() }),
  encoding: Encoding.Borsh,
  networkId,
});

console.log(
  nodeUrl
    ? `Connecting to Kaspa ${networkId} at ${nodeUrl}...`
    : `Connecting to Kaspa ${networkId} via public resolver...`
);
await rpc.connect();
const info = await rpc.getServerInfo();
console.log("Connected to:", rpc.url);
console.log("Server info:", info);
await rpc.disconnect();
console.log("RPC connectivity OK.");
