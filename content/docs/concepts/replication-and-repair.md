---
title: Replication and repair
section: Concepts
order: 4
description: How the chain assigns several providers to one object, and how a failed copy is replaced from a healthy one.
---

# Replication and repair

`open-deal ... --replication N [--min-replicas M]` stores N copies of an object on N distinct providers.

## Assignment

The chain ranks active providers that have enough free bytes by:

```text
sha256("vaultchain/assign/v1" || app hash before the block || deal id || address)
```

and assigns the first N. A provider address in the message pins the first replica; `-` lets the chain pick all of them. Capacity is reserved on every assigned provider, and the escrow is `N x per_replica_payment`. Archive deals default to N=3 and market deals to N=1.

You upload the object to each assigned provider. The deal stays `pending` until `min_replicas` of them accept.

## Repair

When a replica misses `max_missed_proofs` epochs in a row it becomes `failed` and is slashed. At the next epoch the chain tries to fill the empty slot:

1. It picks a provider that **never held this deal**, by the same ranking.
2. The new provider copies the bytes from another active replica over HTTP, using the endpoint registered on chain. Providers sign these fetches with their own key, and a replica of a pending or open deal is allowed to read the object.
3. It verifies the whole object against the root, accepts the deal and starts proving.

If no provider is eligible the slot stays empty and the chain retries every epoch. If every replica fails, the deal ends `failed` with a full refund.

## What has been tested live

The project's end-to-end scripts passed against the previous Fly devnet with extra providers deployed: replication (two providers, hash-identical downloads) 11/11 and repair (one replica machine stopped, slot reassigned to a spare that fetched from the healthy replica) 15/15. Those extra providers were destroyed and the chain was reset on 2026-10-25, so the **public devnet now has one provider and cannot replicate or repair**. See the [Fly devnet guide](/docs/guides/fly-devnet) for how to bring them back.

## Limits

- Replica selection ignores locality, price and reputation.
- There is no cap on repair attempts.
- Repair needs a third eligible provider for a two-replica deal, because a failed provider is excluded from its own deal.
