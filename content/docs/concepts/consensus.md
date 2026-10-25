---
title: Consensus and state
section: Concepts
order: 6
description: The single-node timer engine, the optional CometBFT multi-validator mode, deterministic block execution and the IBC payments-only policy.
---

# Consensus and state

VaultChain is a storage settlement chain: it finalizes transactions about deals, payments, grants and proofs. It is not a general smart-contract platform.

## Two engines, one state machine

| | Timer engine (default) | CometBFT mode |
| --- | --- | --- |
| Flag | `vaultd start` (or `--consensus timer`) | `vaultd start --consensus comet` |
| Validators | one | several, equal power fixed at genesis |
| Blocks | one every `--block-interval` (2 s default, 3 s on the Fly devnet) | CometBFT rounds, `timeout_commit` from `--block-interval` |
| Fault tolerance | none: a single machine | strictly more than 2/3 of the power must sign |
| Used by | the public devnet `vault-devnet-1` | local runs and a verified-then-retired 3-validator Fly network |

The public devnet runs the timer engine on one machine. If its volume is lost, the chain is lost.

With CometBFT, `CheckTx` runs the admission checks (signature, chain id, nonce including this node's pending transactions, the node-local `--min-fee`, fee affordability). `FinalizeBlock` and `Commit` use the same deterministic apply logic as the timer engine, and the app hash is the real hash of state, identical on every node at a given height. Three equal validators tolerate **no** failure (stop one and the chain halts until it returns); four tolerate one. There is no staking, validator-set change or validator slashing yet.

## Deterministic execution

A block is executed from `{height, time, proposer, txs}` and nothing else: no wall clock, no randomness. Replaying the same inputs on the same genesis gives the same state and app hash. For each transaction:

1. **Ante checks**: signature, chain id, nonce equal to the account's nonce, fee affordable. A failure rejects the transaction with no effect.
2. The **fee** moves to the block proposer's account (or a fee-collector account) and the nonce increments. These persist even if the messages fail, so a failed transaction cannot be replayed for free.
3. The **messages** run on a cached branch. If any message errors, the whole branch is dropped, so there are no partial effects. The result (`ok` plus a log line) is recorded so clients can see why a transaction failed.

State is one key per record in a bbolt store. The app hash is an order-independent, incremental hash over all non-bookkeeping entries. That is fine for a lab chain; the design notes say to replace it with a Merkle-style commitment before any public network. Transaction records are kept for the last 1,000 blocks; block headers are kept forever. See [signed transactions](/docs/reference/transactions) for the wire format.

## IBC payments only

VaultChain accepts ICS-20 payment denominations only. Storage infrastructure (providers, proofs, deals, bytes) stays native.

- Allowed: ICS-20 token transfers in and out, and paying for plans and deals with whitelisted denoms.
- Forbidden: cross-chain provider discovery, cross-chain proofs or deal lifecycle, routing object bytes over IBC, and ICS-27 interchain accounts for storage control.

The policy is served at `GET /vaultchain/ibc/policy`, and `payment_denom_whitelist` in the storage params enforces it. On the devnet only `uvault` is whitelisted. A lab-mode message mints fake vouchers for testing, and the public REST refuses it without the node's admin token.
