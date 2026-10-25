---
title: Using the web vault
section: Guides
order: 1
description: Profiles, passphrases, auto-lock, backups, uploads, sharing and downloads in the browser vault, and how your keys are stored.
---

# Using the web vault

The [vault](/vault) is a client-side app: keys are generated and used in your browser, transactions are signed there, and only signed transactions, ciphertext chunks and read tokens are ever sent anywhere. There are no accounts on a server.

> **Devnet warning.** If you lose your passphrase or your key you lose access to the funds and files. We cannot recover either. The network is a test network and can be reset.

## Profiles

A **profile** is a name, an avatar colour, an address and an encrypted key. Several profiles can live in one browser and you can switch between them. Only one is unlocked at a time: unlocking another profile locks the first. Each profile also has its own **contacts** (an address book for sharing).

Create a profile from scratch, import a hex private key, or import an encrypted backup file exported from this app.

## How keys are stored

Your private key never touches storage in plain form.

| Item | Value |
| --- | --- |
| Key derivation | scrypt, N = 2^16 (65,536), r = 8, p = 2, about 64 MiB of memory, 32-byte random salt |
| Passphrase handling | Unicode NFKC normalized, UTF-8 |
| Encryption | AES-256-GCM (WebCrypto), 96-bit random IV, 128-bit tag |
| Plaintext | the 32-byte secp256k1 private key (ciphertext is 48 bytes) |
| Authenticated data | profile id, address, public key, KDF name and parameters, salt |
| After unlock | the key is held in memory only, and zeroed on lock |
| Imports | scrypt cost is bounded (N between 2^14 and 2^18) so a file cannot make your browser stall or weaken your key |

The address and public key are re-derived after decryption and must match the stored profile, so swapping or editing a key blob fails. A wrong passphrase and a modified file both fail authentication. The profile name and colour are cosmetic and not authenticated. A passphrase needs at least 12 characters, and common passwords are rejected, because an attacker who copies your encrypted keystore can guess offline at the speed of scrypt.

## Unlock, lock and auto-lock

Unlock a profile with its passphrase to sign. The vault locks automatically after a period of inactivity (1, 5, 10, 30 or 60 minutes; default 10), when you press **Lock**, and when the tab is hidden longer than that period. Locking wipes the key from memory. Browsing balances and public data does not need an unlocked profile.

## Backups

**Export encrypted backup** downloads a JSON file with your sealed keystores (key material is encrypted with the same passphrase as before, never in clear). Keep a copy somewhere safe, and remember the passphrase; the file is useless without it. You can import it into another browser. **Reveal private key** shows the raw hex after you re-enter the passphrase, which you can import into another copy of this vault.

Clearing your browser data deletes your profiles. Back up first.

## Uploading

1. Unlock a profile with a balance. A new profile has none: press **Get 100 devnet VAULT** on the Overview tab ([faucet guide](/docs/guides/faucet)). The page shows your balance and the current block height.
2. Choose a file (the browser vault accepts up to 64 MiB) and decide whether to **encrypt in this browser**. Encrypted uploads use [vle1](/docs/concepts/access-and-encryption); the file key is sealed to your own account key.
3. The app builds chunks and the Merkle root, signs `CommitManifest` and `OpenDeal` (10,000 blocks, replication 1, payment 10 VAULT for small files), uploads the chunks to the provider and waits for the provider to accept. It shows a progress step for each stage.

## My files, shared with me, downloads

**My files** lists your manifests with their deal state, expiry height and each replica's last proven block. **Shared with me** lists access grants where you are the grantee. A download fetches chunks with a read token you sign locally, verifies the Merkle root, and (for encrypted files) decrypts in the browser and offers you the plaintext.

## Sharing

On an owned file, **Grant** takes a contact or a pasted address and an expiry. For an encrypted file the app looks up the grantee's public key on chain and seals the file key to it. If the person has never sent a transaction they have no public key on chain yet and cannot be granted an encrypted file. **Revoke** removes their grant and key envelope; see [revocation limits](/docs/concepts/access-and-encryption#revoking).

## Why there is no "log in with email"

Because that would make us hold your key, or be able to reset it. A service that can reset your password can also reset it for someone who steals your inbox, a court order, or an insider, and it must keep your funds and decryption key reachable by itself. VaultChain's promise is that the people holding your bytes cannot read them and the people running this website cannot sign for you. So your identity is a key you control, protected by a passphrase only you know, with a backup file you keep.

## Limits

- Only the browser's own storage backs the vault. Another device needs the backup file.
- Large files are held in memory during encryption, hashing and download.
- The public devnet has one provider, so there is no replication.
- Browser extensions and malicious pages can read what is in the page. Use a clean profile for anything that matters.
