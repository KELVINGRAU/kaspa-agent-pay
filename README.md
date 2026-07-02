# kaspa-agent-pay

**A native Kaspa (KAS) payment rail for AI agents, exposed as an MCP server.**

AI agents increasingly need to pay for things autonomously — API calls, services from other agents, data. Emerging standards (x402, AP2, MPP) solve the *protocol* side, but they need a settlement layer that is fast and cheap enough for machine-speed commerce. Kaspa's blockDAG delivers sub-second block times and sub-cent fees, which makes it a natural fit.

`kaspa-agent-pay` gives any MCP-compatible AI agent (Claude, and others) a wallet and a payment toolset on Kaspa: check balance, send payments, and settle pay-per-call invoices between agents.

> **Proven on the live network:** the full flow — public node discovery, balance, transaction build/sign/submit, confirmation — was exercised end-to-end on testnet-10. A 10 tKAS payment confirmed in **~1.5 seconds** with a **~0.002 KAS** fee: [view the transaction](https://explorer-tn10.kaspa.org/txs/bd7557dd30e7e52f68bcce8ac90faa065f4524360ae53ab8354946450c2c9878).

## Why Kaspa for agent payments

- **Crescendo hardfork (May 2025):** the network runs at ~10 blocks/second with near-instant confirmation.
- **Kasplex zkEVM:** an EVM-compatible L2 on mainnet enables Solidity contracts (used in phase 2 of the roadmap below).
- **Covenant hardfork (expected June 2026):** native assets and programmable covenants.
- **Roadmap toward 100 BPS:** throughput headroom for high-frequency agent-to-agent traffic.

## MCP tools exposed

| Tool | Description |
|---|---|
| `get_wallet_address` | The agent's main Kaspa address |
| `get_balance` | Confirmed KAS balance |
| `send_payment` | Send KAS to another address (respects the `KASPA_MAX_SEND_KAS` cap) |
| `wait_for_confirmation` | Wait until a transaction leaves the mempool (best-effort signal) |
| `create_invoice` | Create an invoice with a unique deposit address |
| `check_invoice` | Check whether an invoice has been paid |
| `list_invoices` | List invoices by status |

Each invoice gets its own freshly generated keypair, so payment is confirmed by checking the UTXOs of that specific address — never by amount coincidence.

## Architecture

```
src/
  config.ts        # network, RPC endpoint, safety limits, .env loading
  wallet.ts        # main wallet key + per-invoice key generation
  kaspa-client.ts  # RPC connection (public-node resolver), balance, send, confirmation
  invoices.ts      # invoice lifecycle: pending -> paid/expired
  server.ts        # MCP server registering the tools above
scripts/
  setup-wallet.ts  # generate a new private key + address
  check-rpc.ts     # network connectivity check
  demo.ts          # end-to-end demo (balance / live payment)
```

Built on [`kaspa-wasm32-sdk`](https://www.npmjs.com/package/kaspa-wasm32-sdk), which bundles a resolver for community-operated public nodes — no node URL configuration needed.

## Quick start

```bash
npm install
npm run setup-wallet     # generates a private key + address; copy into .env
cp .env.example .env     # then paste KASPA_PRIVATE_KEY_HEX
npm run check-rpc        # verify network connectivity
npm run demo             # show wallet address + live balance
npm run demo -- send     # send 10 tKAS back to the faucet and time the confirmation
```

Fund your printed address with a [testnet-10 faucet](https://faucet-tn10.kaspanet.io) before sending.

Register as an MCP server (Claude Code / Claude Desktop):

```bash
claude mcp add kaspa-agent-pay -- npx tsx src/server.ts
```

## Safety model

- **Testnet by default.** `KASPA_NETWORK=mainnet` refuses to start unless `KASPA_ALLOW_MAINNET=true` is also set — an agent-controlled wallet should never touch real funds by accident.
- **Per-transaction cap.** `send_payment` rejects any amount above `KASPA_MAX_SEND_KAS` (default 50), limiting the blast radius of a buggy or manipulated agent.
- **Keys never touch disk automatically.** `setup-wallet` only prints to the terminal; you decide what goes into `.env` (which is gitignored).
- **Fees are network-priced.** The sender queries the node's fee estimate and pays the required feerate automatically.
- **Confirmation is a heuristic.** "Left the mempool" is a strong signal given Kaspa's sub-second blocks, but not cryptographic proof — for high-value transfers, verify the recipient's UTXO set.

## Roadmap

1. **Spending-limit session contract on Kasplex zkEVM** — an agent pre-authorizes a spend cap on-chain; a counterparty draws micropayments within it without per-call approval (MPP-style, but trustless).
2. **Agent identity & reputation layer** — an address's on-chain payment history becomes publicly verifiable reputation between agents.
3. **Protocol specification (KIP-style)** — formalize the invoice + dedicated-address flow as a standard to propose to the Kaspa community.

## Support this project

If this is useful to you, donations keep development going:

```
kaspa:qz2wevjcu0hndueku3q39f6x4wy97am4anycstne37gvhgu6q8hucaarazhuu
```

## License

[MIT](LICENSE)
