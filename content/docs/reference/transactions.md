---
title: Signed transactions
section: Reference
order: 4
description: The exact wire format of a transaction, how it is signed, and each message type, with the TypeScript and CLI equivalents.
---

# Signed transactions

Everything that changes state goes through `POST /vaultchain/txs` as one JSON document. You can build it by hand, with the [CLI](/docs/reference/cli), or with the TypeScript client in this site's repository (`lib/vault`).

## Accounts and addresses

- Key: secp256k1. Public key: 33-byte compressed, hex.
- Address: `bech32("vault", ripemd160(sha256(compressed pubkey)))`, for example `vault10r2hysg8036ua7au2qu2u9v4vhky2q649a5lht`.
- Denomination: `uvault`; 1 VAULT = 1,000,000 uvault. Fees are paid in `uvault`.
- The next nonce is `pending_nonce` from `GET /vaultchain/auth/accounts/{address}`.

## Transaction JSON

```json
{
  "chain_id": "vault-devnet-1",
  "nonce": 0,
  "msgs": [ { "type": "bank/Send", "to": "vault1...", "amount": [ { "denom": "uvault", "amount": "1000000" } ] } ],
  "fee": [ { "denom": "uvault", "amount": "1000" } ],
  "pubkey": "02ab...",
  "sig": "3f9c..."
}
```

Fields are written in exactly this order, without whitespace, and optional fields that are empty are omitted. The signature covers the same document **without** `"sig"`, and Go and TypeScript must agree byte for byte (the vector tests in the repository check this).

## Signing

```text
signBytes = "vaultchain/tx/v1\n" + <tx JSON without sig, ending with "}">
digest    = sha256(signBytes)
sig       = secp256k1 ECDSA over digest, 64-byte compact r||s, low-S, hex
```

The node verifies the signature against the `pubkey` field, checks that the address of that pubkey owns the account paying the fee, then registers the pubkey on chain (first valid transaction) so others can seal encrypted keys to you.

## Messages

| `type` | Fields | Notes |
| --- | --- | --- |
| `bank/Send` | `to`, `amount[]` | `amount` entries are `{denom, amount}` with the amount as a string |
| `storage/CommitManifest` | `root`, `size`, `chunk_size`, `mime`, `name`, `encryption?`, `key_envelope?` | `mime` is lowercase `type/subtype`; `name` has no path separators; encrypted manifests need `encryption: "vle1"` and an envelope |
| `storage/OpenDeal` | `class`, `cid`, `size`, `provider`, `duration_blocks`, `denom`, `replication`, `min_replicas` | `class` is `market` or `archive`; `provider` may be empty; `size` must equal the manifest size |
| `access/GrantAccess` | `cid`, `grantee`, `capability`, `expiry_height`, `key_envelope?` | `capability` is `read` or `write`; grantee `*` means anyone, read only |
| `access/RevokeAccess` | `cid`, `grantee?` or `grant_id?` | owner only |

Provider messages (`storage/RegisterProvider`, `AcceptDeal`, `SubmitProof`) and capacity purchases use the same envelope; the CLI builds them.

## Fees, nonces and results

- A public node refuses a transaction whose fee is below its minimum (1,000 uvault on the devnet) with `400`.
- The nonce must equal the account's current nonce; sending several in a row requires incrementing it yourself, or waiting for each block.
- `POST` returns `{"hash": "...", "status": "queued"}` as soon as the transaction is accepted into the pool. It is **not** final. Poll `GET /vaultchain/txs/{hash}` until it returns `{"tx": {"hash", "height", "ok", "result"}}` (404 while pending or after the node pruned records older than 1,000 blocks). `ok: false` carries the failure reason in `result`.
- A failed transaction still pays its fee and uses its nonce.

## Example with curl

```bash
# 1. next nonce
curl -s https://vaultl1-devnet.fly.dev/vaultchain/auth/accounts/vault10r2hysg8036ua7au2qu2u9v4vhky2q649a5lht
# {"address":"vault10r2hysg8036ua7au2qu2u9v4vhky2q649a5lht","nonce":N,"pending_nonce":N}

# 2. submit a signed tx
curl -s -X POST https://vaultl1-devnet.fly.dev/vaultchain/txs -H 'content-type: application/json' --data @tx.json
# {"hash":"<64 hex>","status":"queued"}

# 3. look the result up a few seconds later
curl -s https://vaultl1-devnet.fly.dev/vaultchain/txs/<hash>
```
