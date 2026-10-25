---
title: Run a provider
section: Guides
order: 3
description: Register as a storage provider, run vault-provider, accept deals and answer proof challenges automatically.
---

# Run a provider

A provider stores object chunks on disk, serves them to people the chain says may read, accepts the deals the chain assigns to it, and proves possession every epoch. It earns the deal payment at expiry and risks slashing of its collateral.

## 1. Key and funds

```bash
vaultd keys add provider --home ~/.vaultchain
vaultd keys show provider --home ~/.vaultchain       # your provider address
vaultd tx bank-send <provider address> 5000000000uvault --from <funded key> --node <REST>
```

You need enough for the **collateral**, plus fees for accepting deals and for every proof (1,000 uvault each, one per 10-block epoch per deal by default).

## 2. Register on chain

```bash
vaultd tx storage register-provider https://my-provider.example 700000000 1000000000uvault \
  --from provider --home ~/.vaultchain --node <REST>
```

The arguments are the public endpoint other people will use, the capacity in bytes, and the collateral. The chain lists you at `GET /vaultchain/storage/providers` as `active`.

## 3. Run the daemon

```bash
vault-provider -address <provider address> -listen :3333 -data ./objects \
  -rest <REST url> -chain-id vault-devnet-1 -home ~/.vaultchain -key provider
```

| Flag | Meaning |
| --- | --- |
| `-address` | your provider address (required) |
| `-listen` | HTTP listen address, default `:3333` |
| `-data` | object directory |
| `-rest` | the node's REST URL |
| `-chain-id` | chain id to sign for |
| `-home`, `-key` | the keyring and key used to accept deals and submit proofs |
| `-fee` | fee for those transactions |
| `-prove-interval` | how often to poll for challenges (default 3s) |
| `-allow-origin` | allow this web origin to call the provider from a browser (CORS is **off** by default) |

When `-home` and `-key` are set the provider **accepts** each deal assigned to it once it holds the complete, verified object, and **submits proofs** by itself. Without them it only stores and serves.

## What it serves

See the [provider API](/docs/reference/provider-api): whole-object or per-chunk uploads that are verified against the manifest root, range reads for authorized readers, and `status`/`version`.

## Failure modes to avoid

- Missing three consecutive epochs fails your replica and slashes 10% of its collateral to the owner.
- Running out of fee balance stops proofs, which looks the same as losing the data.
- A full disk or lost volume loses the data. Another replica can repair the deal only if one exists.
- The CLI keyring is unencrypted: a stolen volume leaks the provider key and its funds.

On Fly.io the whole setup, including a self-registering entrypoint, is scripted: see the [Fly devnet guide](/docs/guides/fly-devnet).
