#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getMainWalletKey } from "./wallet.js";
import { getBalanceSompi, sendPayment, waitForConfirmation } from "./kaspa-client.js";
import { createInvoice, checkInvoice, listInvoices } from "./invoices.js";
import { config } from "./config.js";

function sompiToKas(sompi: bigint): number {
  return Number(sompi) / 1e8;
}

function textResult(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

const server = new McpServer({
  name: "kaspa-agent-pay",
  version: "0.1.0",
});

server.registerTool(
  "get_wallet_address",
  {
    title: "Get Kaspa wallet address",
    description: `Return this agent's main Kaspa receiving/spending address on ${config.networkId}.`,
    inputSchema: {},
  },
  async () => textResult({ address: getMainWalletKey().address, network: config.networkId })
);

server.registerTool(
  "get_balance",
  {
    title: "Get Kaspa balance",
    description: "Get this agent's confirmed KAS balance.",
    inputSchema: {},
  },
  async () => {
    const { address } = getMainWalletKey();
    const sompi = await getBalanceSompi(address);
    return textResult({ address, balanceKas: sompiToKas(sompi) });
  }
);

server.registerTool(
  "send_payment",
  {
    title: "Send a Kaspa payment",
    description:
      `Send KAS from this agent's wallet to another address. ` +
      `Capped at ${config.maxSendKas} KAS per call (KASPA_MAX_SEND_KAS).`,
    inputSchema: {
      toAddress: z.string().describe("Recipient Kaspa address"),
      amountKas: z.number().positive().describe("Amount in KAS to send"),
      priorityFeeKas: z.number().nonnegative().optional().describe("Optional extra priority fee in KAS"),
    },
  },
  async ({ toAddress, amountKas, priorityFeeKas }) => {
    const result = await sendPayment(toAddress, amountKas, priorityFeeKas ?? 0);
    return textResult(result);
  }
);

server.registerTool(
  "wait_for_confirmation",
  {
    title: "Wait for transaction confirmation",
    description:
      "Poll until a transaction leaves the mempool (best-effort confirmation signal) or the timeout elapses.",
    inputSchema: {
      txId: z.string(),
      timeoutSec: z.number().positive().optional(),
    },
  },
  async ({ txId, timeoutSec }) => textResult(await waitForConfirmation(txId, (timeoutSec ?? 30) * 1000))
);

server.registerTool(
  "create_invoice",
  {
    title: "Create a payment invoice",
    description:
      "Create an invoice with a unique deposit address that another agent must pay to receive a service. " +
      "Use check_invoice to poll for payment.",
    inputSchema: {
      amountKas: z.number().positive(),
      memo: z.string().optional(),
      expiresInSec: z.number().positive().optional().describe("Default 900 (15 minutes)"),
    },
  },
  async ({ amountKas, memo, expiresInSec }) => textResult(createInvoice(amountKas, memo, expiresInSec ?? 900))
);

server.registerTool(
  "check_invoice",
  {
    title: "Check invoice payment status",
    description: "Check whether an invoice is still pending, has been paid, or has expired.",
    inputSchema: { invoiceId: z.string() },
  },
  async ({ invoiceId }) => textResult(await checkInvoice(invoiceId))
);

server.registerTool(
  "list_invoices",
  {
    title: "List invoices",
    description: "List invoices created by this agent, optionally filtered by status.",
    inputSchema: {
      status: z.enum(["pending", "paid", "expired"]).optional(),
    },
  },
  async ({ status }) => textResult(listInvoices(status))
);

const transport = new StdioServerTransport();
await server.connect(transport);
