---
title: Devnet faucet
section: Guides
order: 5
description: Get free devnet VAULT for a new address, what the limits are, how the faucet is built and what it cannot do.
---

# Devnet faucet

The faucet gives a new address enough devnet VAULT to try the system: **100 VAULT per request**, about ten small uploads at the web vault's default deal. It is part of this website, not of the chain.

> **Devnet only.** The tokens have no value. The faucet refuses to run unless the node reports a chain id containing `devnet`, and a **devnet reset wipes every balance**, including yours and the faucet's. Nothing here is a promise that funds will still exist tomorrow.

## Use it

In the [vault](/vault), unlock a profile and press **Get 100 devnet VAULT** on the Overview tab. The result, an explorer link or the reason for a refusal, appears under the button. A refusal for the cooldown tells you how long to wait.

From a terminal:

```bash
curl -sS -X POST https://vaultchain-web.vercel.app/api/faucet \
  -H 'content-type: application/json' \
  -d '{"address":"vault1..."}'
```

`GET /api/faucet` returns whether the faucet is enabled, the faucet's public address, the drip size and the cooldown.

| Status | `code` | Meaning |
|---|---|---|
| 200 | | Sent. The body has `txHash`, `height`, `amountUvault` and `nextEligibleAt`. |
| 400 | `invalid_address` | Not a bech32 `vault1...` address (or the faucet's own). |
| 409 | `already_funded` | The address holds 50 VAULT or more. The faucet only tops up emptier accounts. |
| 429 | `address_cooldown`, `ip_limit`, `too_many_requests`, `faucet_busy` | A limit below was hit. `Retry-After` says when to retry. |
| 502, 503 | `node_error`, `node_busy`, `faucet_empty`, `disabled`, `not_devnet` | The node, the faucet's balance or its configuration prevented the transfer. |

## Limits, honestly

| Limit | Value | How it is enforced |
|---|---|---|
| Drip | 100 VAULT (100,000,000 uvault) | fixed in code |
| Per address | one drip per 24 h | in memory, per server instance |
| Per client IP | 3 drips per 24 h, 20 requests per hour | in memory, per server instance |
| Per server instance | 40 drips per 24 h | in memory |
| Recipient balance | refused at 50 VAULT or more | read from the chain on every request, so it holds across instances |
| Faucet balance | funded with about 3,000 VAULT; refuses when under 110 VAULT | read from the chain, so it is a hard cap on total loss |

The in-memory counters reset on a cold start and are not shared between serverless instances, so a determined person who spreads requests over instances and addresses can take more than one drip per day. What bounds the damage is the last two rows: the balance check works across instances, and the faucet holds only a few thousand test tokens. The operator can add a firewall rate limit on `POST /api/faucet` at the hosting layer; that is outside this code. The client IP comes from the hosting edge headers (`x-real-ip`, then `x-forwarded-for`), which the edge sets itself.

## How it works

- A route handler (`app/api/faucet/route.ts`) holds a **dedicated key**, in the server-only environment variable `FAUCET_PRIVATE_KEY`. It is a normal secp256k1 key used for nothing else, not a validator, provider or user key, and it holds a small balance. It is never sent to the browser.
- A request is validated, rate limited, and then the handler signs an ordinary `bank/Send` of 100 VAULT with the standard 1,000 uvault fee and submits it to the node like any other client, then waits for the block that includes it. There is no special privilege on the chain.
- Requests are handled one at a time per server instance, using the node's `pending_nonce`, so concurrent requests do not collide on nonce.
- The code is `lib/faucet.ts` (logic, with unit tests that use a fake node) and the route handler.

## Run your own

Set `FAUCET_PRIVATE_KEY` (64 hex characters, server-side only, never `NEXT_PUBLIC_`) in the environment of your copy of [vaultchain-web](https://github.com/VaultChainHQ/vaultchain-web), generate it with any secp256k1 tool, and send its address a modest balance from a funded account. With the variable unset the endpoint answers `disabled` and the vault shows a note that the faucet is not enabled. See [Run a node](/docs/guides/run-a-node) for funding accounts in genesis instead.
