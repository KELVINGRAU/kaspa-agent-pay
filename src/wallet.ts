import { Keypair, PrivateKey } from "kaspa-wasm";
import { config } from "./config.js";

export interface WalletKey {
  privateKey: PrivateKey;
  address: string;
}

let mainKeypair: Keypair | null = null;

function getMainKeypair(): Keypair {
  if (mainKeypair) return mainKeypair;
  if (!config.privateKeyHex) {
    throw new Error(
      "KASPA_PRIVATE_KEY_HEX is not set. Run `npm run setup-wallet` to generate one, then add it to .env."
    );
  }
  mainKeypair = new PrivateKey(config.privateKeyHex).toKeypair();
  return mainKeypair;
}

// The wallet's single spending/change/receive key. This SDK build has no
// ergonomic HD-derivation-to-PrivateKey path, so invoices get their own
// freestanding key instead of a derived child key (see generateInvoiceKey).
export function getMainWalletKey(): WalletKey {
  const keypair = getMainKeypair();
  return {
    privateKey: keypair.privateKey,
    address: keypair.toAddress(config.networkId).toString(),
  };
}

// Each invoice gets a brand-new, unrelated keypair so incoming payments can
// be matched to a specific invoice by address rather than by amount.
export function generateInvoiceKey(): WalletKey {
  const keypair = Keypair.random();
  return {
    privateKey: keypair.privateKey,
    address: keypair.toAddress(config.networkId).toString(),
  };
}
