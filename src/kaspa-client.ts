import "./ws-polyfill.js";
import {
  RpcClient,
  Encoding,
  Address,
  PaymentOutput,
  PaymentOutputs,
  UtxoEntries,
  createTransaction,
  signTransaction,
  kaspaToSompi,
  type UtxoEntryReference,
} from "kaspa-wasm";
import { config } from "./config.js";
import { getMainWalletKey } from "./wallet.js";

let rpc: RpcClient | null = null;
let connected = false;

export async function getRpc(): Promise<RpcClient> {
  if (!rpc) {
    if (!config.nodeUrl) {
      throw new Error(
        `KASPA_NODE_URL is not set. Point it at a Kaspa wRPC endpoint for ${config.networkId} ` +
          "(your own `kaspad --utxoindex`, or a trusted public node)."
      );
    }
    rpc = new RpcClient(config.nodeUrl, Encoding.Borsh, config.networkId);
  }
  if (!connected) {
    await rpc.connect({});
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
  return resp.entries as UtxoEntryReference[];
}

export interface SendResult {
  txId: string;
}

// NOTE: this is the one code path in the project that could not be
// exercised against a live node from the dev sandbox (no funded testnet
// wallet, no reachable wRPC endpoint here). The call shapes below follow
// kaspa-wasm's low-level createTransaction/signTransaction/submitTransaction
// primitives as declared in kaspa_wasm.d.ts. Run `npm run check-rpc` for
// connectivity, then send a small testnet-10 amount and confirm it lands
// before trusting this with anything of value.
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

  const spender = getMainWalletKey();
  const entries = await getUtxoEntries(spender.address);
  if (entries.length === 0) {
    throw new Error(
      `No spendable UTXOs found for ${spender.address}. Fund this address first (use a ${config.networkId} faucet).`
    );
  }

  const signable = createTransaction(
    new UtxoEntries(entries),
    new PaymentOutputs([new PaymentOutput(new Address(toAddress), kaspaToSompi(amountKas))]),
    new Address(spender.address),
    kaspaToSompi(priorityFeeKas),
    [],
    1,
    1
  );

  const signed = signTransaction(signable, [spender.privateKey], true);

  const client = await getRpc();
  await client.submitTransaction({ transaction: signed.tx, allowOrphan: false });

  return { txId: signed.tx.id };
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
      .getMempoolEntry({ transactionId: txId })
      .then(() => true)
      .catch(() => false);

    if (!inMempool) {
      return { txId, confirmed: true };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { txId, confirmed: false, reason: "timeout" };
}
