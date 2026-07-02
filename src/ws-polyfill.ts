import WebSocket from "isomorphic-ws";

// kaspa-wasm's RpcClient expects a W3C-compatible global WebSocket, which
// Node.js does not provide on its own. This must be imported before any
// module that touches kaspa-wasm's RPC layer.
if (!(globalThis as unknown as { WebSocket?: unknown }).WebSocket) {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}
