---
title: Node REST API
section: Reference
order: 2
description: Every public endpoint of the vaultd REST API with parameters, status codes and real JSON responses.
---

# Node REST API

Base URL on the public devnet: `https://vaultl1-devnet.fly.dev` (locally `http://127.0.0.1:1317`). Responses are JSON, CORS allows any origin, and **errors are plain text** with an HTTP status. There is no authentication on reads. The Tendermint-style RPC (`/status`, `/broadcast_tx_*`) is not public.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /cosmos/base/tendermint/v1beta1/node_info` | height, chain id, consensus engine |
| `GET /cosmos/bank/v1beta1/balances/{address}` | balances |
| `GET /vaultchain/storage/params` | storage parameters |
| `GET /vaultchain/storage/providers` and `/{address}` | providers |
| `GET /vaultchain/storage/deals` and `/{id}` | deals; filters `cid`, `provider`, `owner` |
| `GET /vaultchain/storage/manifests` and `/{root}` | manifests; filter `owner` |
| `GET /vaultchain/storage/challenge/{deal_id}?provider=` | the current challenge for one replica |
| `GET /vaultchain/storage/plans` | personal capacity plans |
| `GET /vaultchain/storage/proofs` | accepted proofs |
| `GET /vaultchain/access/grants` | grants; filter `cid` |
| `GET /vaultchain/ibc/policy` | payments-only policy |
| `GET /vaultchain/auth/accounts/{address}` | nonces |
| `GET /vaultchain/auth/pubkeys/{address}` | registered public key |
| `POST /vaultchain/txs` | submit a [signed transaction](/docs/reference/transactions) |
| `GET /vaultchain/txs/{hash}` | a recent transaction's result |

There is no block listing endpoint; transaction records are kept for the last 1,000 blocks.

## Node and balance

```bash
curl -s https://vaultl1-devnet.fly.dev/cosmos/base/tendermint/v1beta1/node_info
```

```json
{
  "application_version": { "app_name": "vaultd", "name": "vaultchain", "version": "0.1.0" },
  "consensus": { "engine": "timer" },
  "default_node_info": { "moniker": "vaultchain-local", "network": "vault-devnet-1", "version": "0.1.0" },
  "height": 3297
}
```

```bash
curl -s https://vaultl1-devnet.fly.dev/cosmos/bank/v1beta1/balances/vault1ns5c3vy747ta0f0c60r5xhj35x6fge7z6vk3j8
# {"balances":[{"denom":"uvault","amount":"..."}]}
```

An address with no funds returns an empty list. The address must be valid bech32 with prefix `vault`.

## Providers

```bash
curl -s https://vaultl1-devnet.fly.dev/vaultchain/storage/providers
```

```json
{
  "providers": [
    {
      "address": "vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2",
      "endpoint": "https://vaultl1-provider.fly.dev",
      "capacity": 700000000,
      "free_bytes": 695749203,
      "collateral": { "denom": "uvault", "amount": "1000000000" },
      "status": "active"
    }
  ]
}
```

`GET /vaultchain/storage/providers/{address}` returns `{"provider": {...}}` or `404`.

## Deals

```bash
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/storage/deals/1"
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/storage/deals?owner=vault10r2hysg8036ua7au2qu2u9v4vhky2q649a5lht"
```

```json
{
  "deal": {
    "id": 1,
    "class": "market",
    "owner": "vault10r2hysg8036ua7au2qu2u9v4vhky2q649a5lht",
    "cid": "c1a89498f32bb2ca3dae49bcbaa3b08b822760ff4ac36e71c2070891bbba7269",
    "size": 65,
    "start_height": 82,
    "expire_height": 10082,
    "payment": { "denom": "uvault", "amount": "10000000" },
    "per_replica_payment": { "denom": "uvault", "amount": "10000000" },
    "replication": 1,
    "min_replicas": 1,
    "replicas": [
      {
        "slot": 0,
        "provider": "vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2",
        "status": "active",
        "assigned_height": 82,
        "accept_deadline_height": 102,
        "accepted_height": 85,
        "last_proven_height": 3291,
        "last_proven_epoch": 3290,
        "missed_proofs": 0
      }
    ],
    "status": "open"
  }
}
```

(Abbreviated sample; the list form returns `{"deals": [...]}`. `400` for a non-numeric id, `404` for an unknown deal.)

## Manifests

```bash
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/storage/manifests?owner=<address>"
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/storage/manifests/<root>"
```

```json
{
  "manifest": {
    "root": "00a361462d4fe0e26aca81144c76a26a1ba6f486f414e3b346f91c26dd46acc4",
    "size": 300000,
    "chunk_size": 262144,
    "mime": "application/octet-stream",
    "name": "e2e-plain-300000.bin",
    "owner": "vault10r2hysg8036ua7au2qu2u9v4vhky2q649a5lht",
    "height": 812
  }
}
```

Encrypted objects add `"encryption": "vle1"` and `"key_envelope": "<210 hex chars>"`.

## Challenges and proofs

```bash
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/storage/challenge/1?provider=vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2"
```

`400` without `provider`, `404` for an unknown deal, `409` when the replica cannot be challenged yet (no epoch started, or it accepted after the epoch began). Proofs are listed as:

```json
{ "proofs": [ { "id": 1, "deal_id": 1, "cid": "c1a894...", "provider": "vault1vg7l...", "height": 3291, "epoch": 3290, "chunk_index": 0 } ] }
```

## Plans, grants, policy

```bash
curl -s https://vaultl1-devnet.fly.dev/vaultchain/storage/plans      # {"plans":[{id, owner, bytes, bytes_used, start_height, end_height, payment}]}
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/access/grants?cid=<root>"
curl -s https://vaultl1-devnet.fly.dev/vaultchain/ibc/policy
```

A grant is `{id, cid, owner, grantee, capability, expiry_height, key_envelope?}`. The IBC policy returns `{mode: "payments-only", allowed, forbidden, note, enforcement}`.

## Accounts and public keys

```bash
curl -s https://vaultl1-devnet.fly.dev/vaultchain/auth/accounts/<address>
# {"address":"vault1...","nonce":4,"pending_nonce":4}
curl -s https://vaultl1-devnet.fly.dev/vaultchain/auth/pubkeys/<address>
# {"pubkey":"02..."}      404 until the account has sent a transaction
```

## Submitting and polling transactions

See [signed transactions](/docs/reference/transactions). Limits on `POST /vaultchain/txs`:

| Status | Meaning |
| --- | --- |
| `200` | `{"hash": "...", "status": "queued"}` |
| `400` | malformed, bad signature, wrong chain id or nonce, fee below the node minimum, or unaffordable fee |
| `403` | a lab-only message without the node's admin token |
| `405` | not a `POST` |
| `429` | per-IP rate limit (60 per minute, burst 30 on the devnet); honour `Retry-After` |

The request body is limited to 1 MiB.
