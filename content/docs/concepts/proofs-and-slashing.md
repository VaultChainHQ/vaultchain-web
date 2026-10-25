---
title: Proofs and slashing
section: Concepts
order: 3
description: How the chain challenges providers every epoch, what a storage proof contains, and what happens when a provider misses them.
---

# Proofs and slashing

The chain does not take a provider's word that it still holds your data. It asks for a small, unpredictable piece and checks it against the root recorded when you uploaded.

## Epochs and challenges

Every `proof_interval_blocks` (10 on the devnet, about 30 seconds) a new **epoch** starts, seeded with the app hash before that block. For each active replica of an open deal the chain derives the challenged chunk:

```text
chunk_index = uint64_be(first 8 bytes of sha256("vaultchain/challenge/v2" || seed || deal_id || provider)) mod chunk_count
```

Because the provider address is part of the input, replicas of the same deal get different questions and cannot answer for one another. You can read the current challenge:

```bash
curl -s "https://vaultl1-devnet.fly.dev/vaultchain/storage/challenge/1?provider=vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2"
```

```json
{
  "challenge": {
    "deal_id": 1,
    "provider": "vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2",
    "epoch": 3290,
    "chunk_index": 0,
    "root": "c1a89498f32bb2ca3dae49bcbaa3b08b822760ff4ac36e71c2070891bbba7269",
    "seed": "da5729efa034036ea080569b6453f7ec2fb9b5e042fb52ac29bd899d91eb74e2"
  }
}
```

## The proof

The provider answers with `MsgSubmitProof {deal_id, cid, epoch, chunk, proof}`: the chunk bytes and the Merkle path. The chain verifies them against the committed root. One proof per replica per epoch counts; a stale epoch or a wrong chunk is rejected. The provider binary polls and proves automatically (default every 3 seconds) and pays the transaction fee each time.

Verified proofs are public: `GET /vaultchain/storage/proofs` lists `{id, deal_id, cid, provider, height, epoch, chunk_index}`.

## Missing proofs and slashing

Each replica keeps a `missed_proofs` counter. It rises when an epoch passes without a valid proof and resets when the provider proves again.

- After `max_missed_proofs` (3) consecutive missed epochs the replica is marked `failed`.
- **10% of that replica's collateral** is slashed to the deal owner, and its reserved capacity is freed.
- At the next epoch the chain tries to [repair](/docs/concepts/replication-and-repair) the slot with a new provider.
- If every replica fails the deal ends `failed` with a full refund.

An accepted replica that never proves anything is also slashed at expiry and earns no payment.

## What a proof does and does not show

A proof shows that the provider held **that one chunk** in **that epoch**. Assurance grows with the number of epochs, not from any single proof. Honest limits of the current design:

- The seed is the public app hash. A proposer could try to grind it, and a provider learns its challenge about one block ahead.
- The multi-validator mode has a fixed validator set and no validator slashing.
- Proof checks use bytes the provider returns, so they show possession, not confidentiality: encrypt before you upload.
- This is lab-grade storage assurance, not production.
