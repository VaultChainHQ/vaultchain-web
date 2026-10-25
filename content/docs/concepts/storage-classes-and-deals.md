---
title: Storage classes and deals
section: Concepts
order: 1
description: Personal plans, market deals and archive deals, how a deal is priced, and how it moves from pending to closed.
---

# Storage classes and deals

A **deal** is the on-chain agreement to keep one object for a number of blocks. The chain escrows your payment, assigns providers, and releases the payment at the end if providers did their job.

## Classes

| Class | What it is | How you buy it |
| --- | --- | --- |
| **Personal** | Prepaid encrypted capacity: a number of bytes for a number of blocks | `vaultd tx storage buy-capacity <bytes> <blocks> uvault` |
| **Market** | A per-object deal, default replication 1 | `vaultd tx storage open-deal market <root> ...` |
| **Archive** | A prepaid longer-horizon deal, default replication 3 | `vaultd tx storage open-deal archive <root> ...` |

The web vault opens **market** deals with replication 1, because the devnet has one provider.

## Pricing

Storage params are public: `GET /vaultchain/storage/params`. On the devnet right now:

```json
{
  "params": {
    "payment_denom_whitelist": ["uvault"],
    "price_per_gb_uvault": 1000000,
    "proof_interval_blocks": 10,
    "max_object_bytes": 4294967296,
    "max_missed_proofs": 3,
    "accept_timeout_blocks": 20
  }
}
```

The price of one replica is linear: `ceil(size / 1 GiB) x price_per_gb_uvault x max(1, duration_blocks / 1000)`. A small file for 10,000 blocks therefore costs 10 VAULT (10,000,000 uvault) per replica. The whole amount is escrowed when the deal opens (`N x per_replica_payment` for replication `N`). Every transaction also pays a network fee, `1000 uvault` by default, and the public node refuses transactions below its minimum fee.

Only denominations in `payment_denom_whitelist` can pay for storage. VaultChain follows an [IBC payments-only policy](/docs/concepts/consensus#ibc-payments-only): foreign tokens may fund deals, but providers, proofs and bytes always stay native. On the devnet only `uvault` is whitelisted; a lab-mode voucher mint stands in for real ICS-20 transfers.

## Lifecycle of a deal

1. **Manifest.** The owner commits a manifest for the object root (`storage/CommitManifest`). Only the manifest owner can open a deal on it.
2. **Open.** `storage/OpenDeal` escrows the payment and the chain assigns `replication` distinct providers by a deterministic ranking. The deal is `pending`. Capacity is reserved on each assigned provider.
3. **Upload and accept.** You upload the chunks to each assigned provider. The provider checks the whole object against the root, then sends `AcceptDeal`. When `min_replicas` (default: all) have accepted, the deal is `open`.
4. **Timeout.** Replicas that do not accept within `accept_timeout_blocks` (20 by default, never past expiry) become `declined`. At the deadline the deal opens if quorum was reached, otherwise it is `cancelled` and the escrow is refunded.
5. **Proofs.** While open, each active replica answers a challenge every epoch. See [proofs and slashing](/docs/concepts/proofs-and-slashing).
6. **Expiry.** Each slot's share is paid to its active replica if it proved at least once. An empty or unproven slot is refunded to you. The deal is `closed` if anyone was paid, `failed` otherwise.

Deal statuses are `pending`, `open`, `closed`, `failed` and `cancelled`; replica statuses are `assigned`, `active`, `failed`, `declined` and `done`.

## Limits worth knowing

- One object is at most `max_object_bytes` (4 GiB). The browser vault caps uploads lower because it holds the file in memory.
- The first account to commit a root owns it. Anyone holding the same bytes could commit first, so ownership is not proof of authorship.
- There is no renewal flow yet: a deal ends at its expiry height. Open a new deal on the same root to keep the file.
