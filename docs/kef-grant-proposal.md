# Grant Proposal Draft — kaspa-agent-pay

> Draft to adapt and submit to the Kaspa Ecosystem Foundation (KEF) or similar
> ecosystem funding programs. Personalize the "About me" section before sending.

## One-liner

An open-source MCP server that gives AI agents a native Kaspa payment rail —
wallet, payments, and pay-per-call invoices — positioning Kaspa as the
settlement layer for the emerging agent-to-agent economy.

## Problem

AI agents are becoming economic actors: they consume paid APIs, hire other
agents, and sell services. Payment standards for agents (x402, AP2, MPP) are
emerging fast, but they settle on slow or costly rails. Machine-speed commerce
needs machine-speed settlement: sub-second finality and sub-cent fees.

## Why Kaspa

Post-Crescendo Kaspa (10 BPS, near-instant confirmation, minimal fees) is the
best-suited L1 for this workload, and the 100 BPS roadmap widens the gap. No
other PoW L1 can settle agent micropayments at this speed. Capturing the
"agent economy" niche early is a strategic win for the ecosystem.

## What already works (proof)

- Open-source MCP server (TypeScript) exposing: `get_balance`, `send_payment`,
  `wait_for_confirmation`, `create_invoice`, `check_invoice`, `list_invoices`.
- Invoices use one dedicated keypair each — payment matched by address, not amount.
- Safety-first defaults: testnet by default, explicit mainnet opt-in, per-tx caps.
- **Tested end-to-end on testnet-10**: 10 tKAS payment confirmed in ~1.5s,
  ~0.002 KAS fee. Transaction:
  https://explorer-tn10.kaspa.org/txs/bd7557dd30e7e52f68bcce8ac90faa065f4524360ae53ab8354946450c2c9878

Repository: https://github.com/YOUR_USERNAME/kaspa-agent-pay

## Funding request & milestones

| # | Milestone | Deliverable |
|---|-----------|-------------|
| 1 | Hardening & persistence | Invoice persistence, reconnection handling, test suite, npm package release |
| 2 | Session contract (Kasplex zkEVM) | Solidity contract: agent pre-authorizes a spend cap; counterparty draws micropayments trustlessly; TypeScript SDK + MCP tools |
| 3 | Reference paid service | A live pay-per-call API demonstrating the full loop (invoice -> KAS payment -> service delivery), with public dashboard |
| 4 | Specification | KIP-style write-up of the agent payment flow for community review |

(Fill in requested amounts per milestone based on current KEF guidelines.)

## About me

I'm a Brazilian developer building in the open. This project started from a
simple conviction: Kaspa will be the payment infrastructure of the agent
economy, and I want to help make that happen. All work is MIT-licensed.

Contact: kelvinneves90@gmail.com
