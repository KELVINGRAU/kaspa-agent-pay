import "./ws-polyfill.js";
import {
  RpcClient,
  Resolver,
  Encoding,
  createTransactions,
  estimateTransactions,
  kaspaToSompi,
  type UtxoEntryReference,
} from "kaspa-wasm32-sdk";
import { config } from "./config.js";
import { getMainWalletKey } from "./wallet.js";

let rpc: RpcClient | null = null;
let connected = false;

export async function getRpc(): Promise<RpcClient> {
  if (!rpc) {
    rpc = new RpcClient({
      // A explicit KASPA_NODE_URL wins; otherwise the Resolver picks a
      // community-operated public node for the configured network.
      ...(config.nodeUrl ? { url: config.nodeUrl } : { resolver: new Resolver() }),
      encoding: Encoding.Borsh,
      networkId: config.networkId,
    });
  }
  if (!connected) {
    await rpc.connect();
    connected = true;
  }
  return rpc;
}

export async function getBalanceSompi(address: string): Promise<bigint> {
  const client = await getRpc();
  const resp = await client.getBalanceByAddress({ address });
  return BigInt(resp.balance);
}

export async function getUtxoEntries(address: string): Promise<UtxoEntryReference[]> {
  const client = await getRpc();
  const resp = await client.getUtxosByAddresses({ addresses: [address] });
  return resp.entries;
}

export interface SendResult {
  txId: string;
}

export async function sendPayment(
  toAddress: string,
  amountKas: number,
  priorityFeeKas = 0
): Promise<SendResult> {
  if (amountKas > config.maxSendKas) {
    throw new Error(
      `Refusing to send ${amountKas} KAS: exceeds KASPA_MAX_SEND_KAS cap of ${config.maxSendKas}. ` +
        "Raise the cap in .env if this is intentional."
    );
  }

  const amountSompi = kaspaToSompi(String(amountKas));
  if (amountSompi === undefined) {
    throw new Error(`Invalid KAS amount: ${amountKas}`);
  }

  const spender = getMainWalletKey();
  const entries = await getUtxoEntries(spender.address);
  if (entries.length === 0) {
    throw new Error(
      `No spendable UTXOs found for ${spender.address}. Fund this address first (use a ${config.networkId} faucet).`
    );
  }

  const client = await getRpc();
  const baseSettings = {
    entries,
    outputs: [{ address: toAddress, amount: amountSompi }],
    changeAddress: spender.address,
    // Required by the generator when `entries` is a plain array.
    networkId: config.networkId,
  };

  // The generator's built-in fee is 1 sompi/gram, but networks can enforce a
  // higher minimum feerate (testnet-10 currently requires ~100 sompi/gram).
  // Estimate the transaction mass (== base fee at 1 sompi/gram), ask the node
  // for the current priority feerate, and add the difference as priority fee.
  const massEstimate = await estimateTransactions({ ...baseSettings, priorityFee: 0n });
  const mass = massEstimate.fees;
  const { estimate: feeEstimate } = await client.getFeeEstimate({});
  const feerate = BigInt(Math.max(1, Math.ceil(feeEstimate.priorityBucket.feerate)));
  const networkPriorityFee = mass * feerate; // total fee = mass*(feerate+1) >= required
  const userPriorityFee = kaspaToSompi(String(priorityFeeKas)) ?? 0n;

  const { transactions } = await createTransactions({
    ...baseSettings,
    priorityFee: networkPriorityFee + userPriorityFee,
  });

  let lastTxId = "";
  for (const pending of transactions) {
    pending.sign([spender.privateKey]);
    lastTxId = await pending.submit(client);
  }

  return { txId: lastTxId };
}

export interface ConfirmationResult {
  txId: string;
  confirmed: boolean;
  reason?: string;
}

// Best-effort confirmation check: once a transaction leaves the mempool it
// has almost certainly been accepted into the blockDAG, given Kaspa's sub-
// second block times. This is a heuristic, not a cryptographic proof of
// acceptance -- for high-value transfers, cross-check the recipient's UTXO
// set directly.
export async function waitForConfirmation(
  txId: string,
  timeoutMs = 30_000,
  pollMs = 1000
): Promise<ConfirmationResult> {
  const client = await getRpc();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const inMempool = await client
      .getMempoolEntry({ transactionId: txId, includeOrphanPool: true, filterTransactionPool: false })
      .then(() => true)
      .catch(() => false);

    if (!inMempool) {
      return { txId, confirmed: true };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { txId, confirmed: false, reason: "timeout" };
}
