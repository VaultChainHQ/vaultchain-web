---
title: Provider HTTP API
section: Reference
order: 3
description: Upload and read objects and chunks from a storage provider, with proofs, read tokens and range requests.
---

# Provider HTTP API

Base URL of the public devnet provider: `https://vaultl1-provider.fly.dev`. CORS is **off** unless the operator sets `-allow-origin`. This site therefore ships a small same-origin proxy at `/api/provider/*` (GET, HEAD and PUT only, a fixed allow-list of paths) so the browser vault can talk to the provider without CORS.

| Method and path | Purpose |
| --- | --- |
| `POST` or `PUT /v1/objects/{root}` | upload a whole object; verified against the on-chain manifest |
| `GET` or `HEAD /v1/objects/{root}` | download (supports `Range`); needs read access |
| `GET /v1/objects/{root}/status` | `{chunks_have, chunks_total, complete}` |
| `PUT /v1/chunks/{root}/{i}` | upload chunk `i` with an `X-Vault-Proof` header |
| `GET` or `HEAD /v1/chunks/{root}/{i}` | download one chunk; needs a read token |
| `GET /status` | `{"address", "chain_id", "objects", "status", "version"}` |
| `GET /version` | `{"version": "vault-provider/3"}` |

## Prerequisites

The manifest for `{root}` must already be committed on chain, and the deal opened with this provider assigned, before it keeps bytes.

## Upload a whole object

```bash
curl -X POST --data-binary @photo.jpg https://vaultl1-provider.fly.dev/v1/objects/<root>
```

The provider re-chunks the body and checks it against the root and size in the manifest. A `2xx` means it holds the complete, verified object; it then accepts the deal and starts proving. For an encrypted file, upload the **ciphertext**.

## Upload chunk by chunk

Browsers use this for large files. Each chunk is `PUT` with its Merkle audit path in the `X-Vault-Proof` header, so the provider can check it against the root immediately:

```bash
curl -X PUT --data-binary @chunk-0.bin \
  -H "X-Vault-Proof: <comma-separated hex hashes, leaf to root>" \
  https://vaultl1-provider.fly.dev/v1/chunks/<root>/0
# {"chunks_have":1,"chunks_total":2,"complete":false}
```

Poll `GET /v1/objects/{root}/status` until `complete` is true.

## Reading

Readers authenticate with a [read token](/docs/concepts/access-and-encryption#grants-and-read-tokens):

```bash
TOKEN=$(vaultd read-token <root> --provider <provider address> --from me --ttl 10m)
curl -H "Authorization: Vault $TOKEN" https://vaultl1-provider.fly.dev/v1/objects/<root> -o file.bin
curl -H "Authorization: Vault $TOKEN" -H "Range: bytes=0-1023" https://vaultl1-provider.fly.dev/v1/objects/<root>
```

You may also pass `?vault_token=<token>` for media elements. Results:

| Status | Meaning |
| --- | --- |
| `200` / `206` | the object, or the requested range |
| `401` | no token and the object is not public |
| `403` | valid token, but no grant for that reader |
| `404` | no manifest for that root, or the provider does not hold it |

A public grant to `*` allows anonymous reads of **unencrypted** objects. Encrypted objects cannot be made public.

## Status

```bash
curl -s https://vaultl1-provider.fly.dev/status
# {"address":"vault1vg7lkgnkt0exarksu3a7wv0rxc374rhuj30ug2","chain_id":"vault-devnet-1","objects":7,"status":"ok","version":"vault-provider/3"}
```
