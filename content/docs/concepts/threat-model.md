---
title: Threat model and limits
section: Concepts
order: 7
description: Who holds what, what the design protects against today, and what it explicitly does not promise.
---

# Threat model and limits

VaultChain splits trust on purpose. Read this before you store anything.

## Who holds what

| What | Who has it | If it is lost |
| --- | --- | --- |
| Private key | Encrypted in your browser's storage (web vault) or the CLI keyring on your machine | Funds, signing and decryption are gone. There is no recovery. |
| Vault passphrase | Only you | The sealed key in the browser cannot be opened. Nobody can reset it. |
| File key | Sealed to your account key inside the manifest and grants | Encrypted files cannot be opened |
| Ciphertext chunks | The storage provider's disk | The deal fails if they miss proofs, unless another replica holds a copy |
| Deals, balances, grants, manifests | The chain node(s) | On the devnet: gone if the single node's volume is lost |

## Protected today

- **Forged transactions.** Every transaction is signed (secp256k1) with chain id, nonce and fee.
- **Replay.** The per-account nonce and chain id are part of what is signed.
- **"I stored it" without the file.** Challenges are checked against the Merkle root; missed ones are slashed.
- **Silent deletion.** Missed proofs fail the replica and slash 10% of its collateral to you.
- **Provider reading encrypted files.** Providers only receive ciphertext.
- **Tampered bytes.** Detected by the Merkle root on download and by authenticated encryption.
- **Unauthorized reads.** Providers check grants on every read.

## Not promised

- **Availability on the devnet.** One validator, one provider, no high availability, resets allowed.
- **Metadata privacy.** Names, sizes, owners, providers and grants are public.
- **Safety against a cheating validator.** The chain has no staking, and the single-node devnet is fully trusted for ordering and state.
- **Strong proof randomness.** The challenge seed is the public app hash.
- **Revocation of keys already handed out.**
- **Quantum resistance.** Keys are elliptic-curve.
- **Password or key recovery.** None exists, by design.
- **Audited code.** None of this has had an external review.

## Browser-vault specific risks

The [web vault](/docs/guides/web-vault) keeps your private key encrypted in `localStorage` and decrypts it into page memory when you unlock. It protects against someone copying your browser profile without your passphrase. It does **not** protect against malware on your device, a malicious browser extension, a compromised copy of this website, or a weak passphrase (an attacker with a copy of the encrypted keystore can guess offline, limited only by the scrypt cost). Treat it as a devnet convenience, not a hardware wallet.

## Operational limits

- The public REST is rate limited per IP and refuses transactions below the minimum fee, but CORS is `*` by design and signed transactions are accepted from anyone with funds.
- Uploaded bytes are verified against the root before a provider keeps them, so they cannot corrupt an object, but uploads still use the provider's disk and bandwidth.
- Read tokens are bearer credentials: one in a URL can end up in logs, so keep lifetimes short.
- The default key store of the CLI (`keyring-test`) is not encrypted. Use it for devnet keys only.
