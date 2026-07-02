import { randomUUID } from "node:crypto";
import { generateInvoiceKey } from "./wallet.js";
import { getUtxoEntries } from "./kaspa-client.js";

export type InvoiceStatus = "pending" | "paid" | "expired";

export interface Invoice {
  id: string;
  address: string;
  amountKas: number;
  memo?: string;
  createdAt: number;
  expiresAt: number;
  status: InvoiceStatus;
  paidTxIds: string[];
}

const invoices = new Map<string, Invoice>();

export function createInvoice(amountKas: number, memo?: string, expiresInSec = 900): Invoice {
  const { address } = generateInvoiceKey();
  const now = Date.now();

  const invoice: Invoice = {
    id: randomUUID(),
    address,
    amountKas,
    memo,
    createdAt: now,
    expiresAt: now + expiresInSec * 1000,
    status: "pending",
    paidTxIds: [],
  };

  invoices.set(invoice.id, invoice);
  return invoice;
}

export async function checkInvoice(id: string): Promise<Invoice> {
  const invoice = invoices.get(id);
  if (!invoice) {
    throw new Error(`Unknown invoice id: ${id}`);
  }
  if (invoice.status === "paid") {
    return invoice;
  }
  if (Date.now() > invoice.expiresAt) {
    invoice.status = "expired";
    return invoice;
  }

  const entries = await getUtxoEntries(invoice.address);
  const totalSompi = entries.reduce((sum, entry) => sum + entry.amount, 0n);
  const totalKas = Number(totalSompi) / 1e8;

  if (totalKas >= invoice.amountKas) {
    invoice.status = "paid";
    invoice.paidTxIds = entries.map((entry) => entry.outpoint.transactionId);
  }

  return invoice;
}

export function listInvoices(status?: InvoiceStatus): Invoice[] {
  const all = Array.from(invoices.values());
  return status ? all.filter((invoice) => invoice.status === status) : all;
}

export function getInvoice(id: string): Invoice | undefined {
  return invoices.get(id);
}
