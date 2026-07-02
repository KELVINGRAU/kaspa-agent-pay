import { Keypair } from "kaspa-wasm";

const networkId = process.env.KASPA_NETWORK ?? "testnet-10";

const keypair = Keypair.random();
const address = keypair.toAddress(networkId).toString();
const privateKeyHex = keypair.privateKey.toString();

console.log("New Kaspa wallet generated.\n");
console.log("Private key (write it down now, NEVER share or commit it):\n");
console.log(`  ${privateKeyHex}\n`);
console.log(`Address on ${networkId}:\n  ${address}\n`);
console.log("Add this line to your .env file:\n");
console.log(`KASPA_PRIVATE_KEY_HEX=${privateKeyHex}\n`);
if (networkId !== "mainnet") {
  console.log(`Fund this address using a ${networkId} faucet before sending payments.`);
}
