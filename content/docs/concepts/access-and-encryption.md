---
title: Access and encryption
section: Concepts
order: 5
description: Client-side XChaCha20-Poly1305 encryption, per-grantee key envelopes, read tokens, and what revoking access really does.
---

# Access and encryption

Two separate mechanisms. **Access control** decides who may fetch bytes from a provider. **Client-side encryption** makes sure the provider, and anyone with its disk or network traffic, cannot read the contents. Use both for private files.

## Client-side encryption (`vle1`)

1. A random 256-bit **file key** is generated per file.
2. The file is encrypted with **XChaCha20-Poly1305** in 64 KiB segments. The stream is a 24-byte header (`"VLE1"`, segment size, a random 16-byte nonce prefix) followed by sealed segments, each with a 16-byte tag. A segment's nonce is the prefix plus its index, and its associated data is the header plus a final-segment flag. A modified, reordered, duplicated, dropped, appended or truncated segment fails authentication, and nothing is released unless every segment verifies.
3. Chunking, the Merkle tree and the root are computed over the **ciphertext**. Providers, [proofs](/docs/concepts/proofs-and-slashing) and [repair](/docs/concepts/replication-and-repair) never see plaintext.
4. The manifest carries `encryption: "vle1"` and the owner's **key envelope**.

## Key envelopes

A key envelope is 105 bytes: `ephemeralPub (33) || nonce (24) || AEAD(file key)`. The wrap key is HKDF-SHA256 over an ECDH secret between a fresh ephemeral secp256k1 key and the recipient's account key, with the object root and the recipient's address mixed into the derivation. An envelope cannot be replayed for another object or person, and only the holder of the recipient's private key can open it.

To share, the owner opens their own envelope, wraps the file key to the grantee's public key, and sends it inside a `access/GrantAccess` message. The chain checks shape only; it never sees a key. Public keys come from an on-chain registry that records an account's key the first time it sends a valid transaction (`GET /vaultchain/auth/pubkeys/{address}`). A person who has never transacted cannot be granted an encrypted file until they send any transaction.

## Grants and read tokens

A provider serves `GET /v1/chunks/{root}/{i}` and `/v1/objects/{root}` only to a reader the chain allows, and re-checks the chain on each request (positive answers are cached for 5 seconds). A reader proves who it is with a signed **read token**:

```text
token = <pubkey_hex>.<expiry_unix>.<signature_hex>
signed message = "vaultchain/read/v1\n<provider address>\n<root>\n<expiry>"
sent as  Authorization: Vault <token>    (or ?vault_token=<token> for <img>/<video>)
```

A token works for one object at one provider and lives at most one hour. A reader is allowed if it owns the manifest, holds a non-expired `read` or `write` grant, the object has a public grant (`*`, unencrypted objects only), or it is an assigned replica of the deal (this is how repair works). No token on a non-public object returns `401`, a valid token without access `403`, an unknown root `404`.

## Revoking

`access/RevokeAccess` is signed by the owner and removes a grantee's grants (or one grant by id) together with their key envelope. Providers stop serving the revoked reader within about five seconds, even if their token has not expired.

> **Revocation cannot un-share a secret.** A grantee who already opened the envelope holds the file key, and if they kept the ciphertext they can still decrypt it. Chain history keeps old blocks. To really cut someone off, encrypt again under a new key (new root), upload it, and grant only the people who should keep access.

## What is protected, what is not

Protected from providers, repair copies, network observers and disk thieves: the **contents** of encrypted files, and tampering with stored bytes (detected at decrypt and by the Merkle root).

Public, always: the file name, MIME type, approximate size, the root, the owner, the providers and deal details, when it was stored, and **who has been granted access**.

## Honest limits

- **Key loss is data loss.** Your file key exists only as an envelope sealed to your account key. Lose the private key and nobody can decrypt your files.
- **No forward secrecy** if your account key is compromised later.
- **Whole-file decryption only.** No streaming playback.
- **Owner authenticity is not proven.** Anyone can commit the same ciphertext first and own the root; only trust roots you were told about.
- A malicious owner can share garbage; a malicious grantee can leak plaintext.
- It is new, unaudited code. The primitives are standard; the construction around them is ours.
