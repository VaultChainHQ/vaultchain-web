---
title: FAQ
section: Project
order: 1
description: Short answers about tokens, safety, privacy, losing keys, availability and how VaultChain compares to other storage networks.
---

# FAQ

## Is this a real network? Can I buy the token?

No. It is a devnet run by one person for testing. Tokens have no value, there is no sale, and the network can be reset.

## How do I get devnet tokens?

There is no public faucet. Genesis funds sit with the operator. Ask for a transfer to your `vault1...` address, or run [your own node](/docs/guides/run-a-node), where you fund yourself in genesis.

## Can I store something important here?

No. One provider holds your bytes, with no redundancy, on a network that can be wiped. It is a place to try the system.

## Who can read my files?

Unencrypted: anyone the access rules allow, plus the provider's operator and anyone who gets its disk. Encrypted: only people you [grant](/docs/concepts/access-and-encryption). File names, sizes and who has access are always public.

## I lost my passphrase. Can you reset it?

No. The passphrase encrypts your key inside your browser and we never see either. Without it (and without a backup that you can unlock), the key, the funds and the encrypted files are gone. That is also why the vault has [no email login](/docs/guides/web-vault#why-there-is-no-log-in-with-email).

## Can I use the same key in the CLI and the browser?

Not directly today. The vault imports a 32-byte hex private key or an encrypted backup from this app. `vaultd keys add` generates a fresh key in the CLI keyring and the CLI has no import command, so a key made in one place is not usable in the other without extra work. The wire format is the same (secp256k1), so both can drive the same chain from different accounts.

## Why do I need funds to upload?

Two reasons. Every transaction pays a fee, and the deal payment is escrowed for the provider. Both are denominated in `uvault`.

## Why can't I share an encrypted file with a friend?

The app needs your friend's public key to seal the file key to them. It comes from the chain's registry, which records it the first time an account sends a transaction. Ask them to send any small transaction first.

## Does revoking remove someone's access immediately?

The provider stops serving them within about five seconds. But if they already opened the key envelope and kept a copy of the ciphertext, they can still decrypt it. See [revocation limits](/docs/concepts/access-and-encryption#revoking).

## How is this different from IPFS, Filecoin, Arweave or Storj?

It borrows ideas (content addressing, storage deals and proofs, collateral and slashing) at a much smaller scale. Differences today: a single-validator devnet with no staking, one provider, no retrieval market, no data retention beyond the deal's lifetime, and none of the scale, audits or economic security of those networks. Treat it as a learning and research project.

## Why is my deal `pending`?

The assigned provider has not yet accepted. It accepts after it holds the complete object (upload the bytes). If it does not accept within `accept_timeout_blocks` (20), the replica is declined, and if quorum is not reached the deal is cancelled and refunded.

## Where is the source?

Everything is MIT-licensed: the [chain](https://github.com/VaultChainHQ/vaultchain), the [explorer](https://github.com/VaultChainHQ/vaultchain-explorer), the [upload client](https://github.com/VaultChainHQ/vaultchain-upload) and [this site](https://github.com/VaultChainHQ/vaultchain-web).
