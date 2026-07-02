// End-to-end demo against the configured network (default testnet-10).
//
//   npm run demo              -> connect, show wallet address + balance
//   npm run demo -- send      -> send 10 TKAS back to the faucet + wait for confirmation
//   npm run demo -- send <address> <amountKas>   -> custom recipient/amount
import "../src/ws-polyfill.js";
import { config } from "../src/config.js";
import { getMainWalletKey } from "../src/wallet.js";
import { getRpc, getBalanceSompi, sendPayment, waitForConfirmation } from "../src/kaspa-client.js";

// Donation address of the testnet-10 faucet -- sending here recycles the tKAS.
const FAUCET_ADDRESS = "kaspatest:qptlzrcs9eeazs7m2e50llcl686sl2yfzsw8543vg3gymc20ywmr7cqwspkhd";

const [, , command, toArg, amountArg] = process.argv;

function kas(sompi: bigint): string {
  return `${Number(sompi) / 1e8} KAS`;
}

const wallet = getMainWalletKey();
console.log(`Network:  ${config.networkId}`);
console.log(`Wallet:   ${wallet.address}`);

const rpc = await getRpc();
console.log(`Node:     ${rpc.url}\n`);

const balance = await getBalanceSompi(wallet.address);
console.log(`Balance:  ${kas(balance)}`);

if (command === "send") {
  const to = toArg ?? FAUCET_ADDRESS;
  const amount = amountArg ? Number(amountArg) : 10;

  console.log(`\nSending ${amount} KAS to ${to} ...`);
  const { txId } = await sendPayment(to, amount);
  console.log(`Submitted! txId: ${txId}`);

  console.log("Waiting for confirmation (tx leaving the mempool)...");
  const started = Date.now();
  const result = await waitForConfirmation(txId);
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  if (result.confirmed) {
    console.log(`CONFIRMED in ~${secs}s`);
  } else {
    console.log(`Not confirmed within timeout (${result.reason}). Check the explorer:`);
  }
  if (config.networkId === "testnet-10") {
    console.log(`Explorer: https://explorer-tn10.kaspa.org/txs/${txId}`);
  }

  const after = await getBalanceSompi(wallet.address);
  console.log(`\nBalance after: ${kas(after)}`);
}

await rpc.disconnect();
