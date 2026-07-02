# kaspa-agent-pay

Servidor MCP (Model Context Protocol) que dá a agentes de IA um trilho de pagamento nativo em **Kaspa (KAS)**: carteira própria, envio/recebimento e faturas para liquidação "pay-per-call" entre agentes — o mesmo problema que protocolos como x402, AP2 e MPP resolvem, só que usando a finalidade quase instantânea do blockDAG do Kaspa em vez de uma L1 lenta.

Por padrão roda em **testnet-10** (KAS de teste, sem valor real). Mainnet exige confirmação explícita — veja [Segurança](#segurança).

## Por que Kaspa

- **Crescendo** (hardfork de maio/2025): rede já opera a ~10 blocos/s com finalidade quase instantânea.
- **Kasplex zkEVM**: L2 EVM-compatível em mainnet, permite contratos Solidity (útil para a Ideia 2 do roadmap abaixo).
- **Covenant** (hardfork previsto para jun/2026): ativos nativos e "programmable covenants".
- Roadmap mira **100 blocos/s** — throughput relevante para volume de chamadas agente-a-agente.

## Arquitetura

```
src/
  config.ts        # rede, endpoint RPC, limites de segurança, variáveis de ambiente
  wallet.ts         # carteira principal (chave privada única) + geração de chaves de fatura
  kaspa-client.ts   # conexão RPC (nó explícito via KASPA_NODE_URL), saldo, envio, confirmação
  invoices.ts       # faturas: cada fatura recebe uma keypair própria, não reaproveitada
  server.ts         # servidor MCP: registra as ferramentas abaixo
scripts/
  setup-wallet.ts   # gera uma chave privada nova e imprime o endereço
  check-rpc.ts      # teste de conectividade contra a rede configurada
```

Cada fatura (`create_invoice`) gera uma keypair nova e independente, então o pagamento é confirmado checando o UTXO desse endereço específico — não por coincidência de valor. O `kaspa-wasm` publicado no npm (0.13.0) não expõe derivação HD até `PrivateKey` nem um resolver de nós públicos embutido, então cada fatura é uma chave solta em memória (não persistida) em vez de um filho derivado de uma mnemônica, e você precisa apontar `KASPA_NODE_URL` para um nó explícito.

## Quick start

```bash
npm install
npm run setup-wallet        # gera uma chave privada + endereço, copie pro .env
cp .env.example .env        # cole KASPA_PRIVATE_KEY_HEX e defina KASPA_NODE_URL
npm run check-rpc           # valida conectividade com a rede antes de confiar em qualquer envio
```

`KASPA_NODE_URL` precisa apontar para um nó Kaspa com wRPC habilitado (`kaspad --utxoindex --rpclisten-borsh=...`) na rede escolhida, ou um endpoint público de confiança. Financie o endereço impresso usando um faucet de testnet-10 antes de testar `send_payment`.

Registrar como servidor MCP (Claude Code / Claude Desktop):

```bash
claude mcp add kaspa-agent-pay -- npx tsx src/server.ts
```

ou aponte para o build compilado (`npm run build && node dist/server.js`).

## Ferramentas expostas

| Ferramenta | Descrição |
|---|---|
| `get_wallet_address` | Endereço principal do agente |
| `get_balance` | Saldo confirmado em KAS |
| `send_payment` | Envia KAS para outro endereço (respeita `KASPA_MAX_SEND_KAS`) |
| `wait_for_confirmation` | Aguarda a transação sair do mempool (sinal best-effort) |
| `create_invoice` | Cria fatura com endereço de depósito único |
| `check_invoice` | Verifica se uma fatura foi paga |
| `list_invoices` | Lista faturas por status |

## Segurança

- **Testnet por padrão.** Definir `KASPA_NETWORK=mainnet` só funciona se `KASPA_ALLOW_MAINNET=true` também estiver setado — falha alto e cedo em vez de deixar um agente controlar fundos reais por acidente.
- **Teto por transação.** `send_payment` recusa qualquer valor acima de `KASPA_MAX_SEND_KAS` (padrão 50 KAS), limitando o dano de um agente manipulado ou com bug.
- **Chave privada nunca em disco automaticamente.** `setup-wallet` só imprime no terminal; você decide colar no `.env` (que já está no `.gitignore`).
- **Confirmação é heurística.** `wait_for_confirmation` usa "saiu do mempool" como proxy de aceitação — válido dado o tempo de bloco sub-segundo do Kaspa, mas não é prova criptográfica. Para valores altos, cheque o conjunto de UTXOs do destinatário diretamente.
- **`send_payment` não foi testado contra um nó ao vivo.** Este projeto foi desenvolvido em um sandbox sem um nó Kaspa alcançável nem carteira de testnet financiada, então o caminho `createTransaction` → `signTransaction` → `submitTransaction` em `src/kaspa-client.ts` segue as assinaturas documentadas no `kaspa_wasm.d.ts` instalado mas **não foi exercido de ponta a ponta**. Antes de usar em qualquer valor real: rode `npm run check-rpc`, depois `send_payment` com um valor pequeno em testnet-10 e confirme que a transação chega ao destino.

## Roadmap (próximas peças do protocolo)

1. **Contrato de sessão/limite no Kasplex zkEVM** — agente pré-autoriza um teto de gastos on-chain; outro agente puxa micropagamentos dentro do limite sem aprovação a cada chamada (modelo tipo MPP, porém trustless).
2. **Camada de identidade/reputação** — histórico de pagamentos on-chain do endereço vira reputação pública verificável entre agentes.
3. **Proposta de especificação (estilo KIP)** — formalizar esse fluxo de fatura + endereço derivado como um padrão a propor pra comunidade Kaspa/KEF.
