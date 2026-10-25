---
title: CLI reference (vaultd)
section: Reference
order: 1
description: Every vaultd command and flag: node, keys, queries, transactions, read tokens, decryption and testnet generation.
---

# CLI reference: `vaultd`

`vaultd` is both the node daemon and the command line client. Build it with `go build -o build/vaultd ./cmd/vaultd`.

Global flag: `--home <dir>` (the node home and keyring; default `~/.vaultchain`).

> **Keys.** The CLI keeps keys in a **test keyring** inside `--home`: plain files, not encrypted. Use it for devnet keys only.

## Node

| Command | Purpose |
| --- | --- |
| `vaultd init [moniker] --chain-id <id> [--lab-mode]` | create the node home and genesis. `--lab-mode` is fixed at genesis and enables only `ibc-lab mint-voucher`. |
| `vaultd genesis add-genesis-account <address> <coins>` | add a funded account to `genesis.json`, e.g. `100000000000uvault` |
| `vaultd start [flags]` | run the node |
| `vaultd testnet [flags]` | generate the files for an N-validator CometBFT network |
| `vaultd version` | print the version |

`start` flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--rpc-addr` | `127.0.0.1:26657` | RPC listen address (keep it private) |
| `--api-addr` | `127.0.0.1:1317` | REST listen address |
| `--min-fee` | none | minimum fee admitted to the pool, e.g. `1000uvault` |
| `--tx-rate` | `0` (unlimited) | `POST /vaultchain/txs` per client IP per minute |
| `--client-ip-header` | none | trusted proxy header holding the real client IP, e.g. `Fly-Client-IP` |
| `--block-interval` | `2s` | timer engine block time, or CometBFT `timeout_commit` |
| `--consensus` | `timer` | `timer` (one node) or `comet` (CometBFT multi-validator) |
| `--moniker`, `--p2p-addr`, `--persistent-peers`, `--external-addr`, `--comet-rpc-addr`, `--comet-log-level` | | comet mode only |

`testnet` flags: `--validators` (3), `--chain-id` (`vault-devnet-2`), `--out` (`build/testnet`), `--hostname-pattern` (`node%d`), `--p2p-port` (26656), `--p2p-port-step` (0), `--validator-funds` (`100000000000000uvault`), `--lab-mode`.

## Keys

| Command | Purpose |
| --- | --- |
| `vaultd keys add <name>` | create a secp256k1 key (the mnemonic is shown once) |
| `vaultd keys list` | list keys |
| `vaultd keys show <name> [--pubkey]` | print the address, or the hex public key |

## Queries

All take `--node <REST url>` (default `http://127.0.0.1:1317`).

| Command | REST equivalent |
| --- | --- |
| `vaultd query status` | node RPC status (needs RPC access, so not on the public devnet) |
| `vaultd query balances <address>` | `/cosmos/bank/v1beta1/balances/{address}` |
| `vaultd query storage-params` | `/vaultchain/storage/params` |
| `vaultd query providers` | `/vaultchain/storage/providers` |
| `vaultd query deals` | `/vaultchain/storage/deals` |
| `vaultd query plans` | `/vaultchain/storage/plans` |
| `vaultd query proofs` | `/vaultchain/storage/proofs` |
| `vaultd query grants [--cid <root>]` | `/vaultchain/access/grants` |
| `vaultd query ibc-policy` | `/vaultchain/ibc/policy` |

## Transactions

Shared flags on every `tx` command: `--from <key name>` (signs), `--node` (REST), `--fee` (default `1000uvault`; `0uvault` for none), `--chain-id` (default: asked from the node).

| Command | Purpose |
| --- | --- |
| `tx bank-send <to> <amount>` | send coins, e.g. `5000000uvault` |
| `tx storage register-provider <endpoint> <capacity_bytes> <collateral>` | become a provider |
| `tx storage buy-capacity <bytes> <duration_blocks> <denom>` | buy a personal plan |
| `tx storage commit-manifest <file> [--mime --name --chunk-size --dry-run --encrypt --cipher-out <path>]` | chunk a file locally and publish its manifest. With `--encrypt`, the ciphertext is written to `--cipher-out` and is what you upload. `--dry-run` prints the root without sending. |
| `tx storage open-deal <class> <root> <size> <provider\|-> <duration_blocks> <denom> [--replication N --min-replicas M]` | open a market or archive deal; size `0` means the manifest size, `-` lets the chain pick the first provider |
| `tx storage accept-deal <deal_id>` | accept an assigned deal (the provider daemon does this automatically) |
| `tx storage submit-proof <deal_id> [--provider-url <url>]` | answer the current challenge by hand |
| `tx access grant <root> <grantee> <read\|write> <expiry_height> [--grantee-pubkey <hex>]` | grant access; grantee `*` means anyone (read only, unencrypted). For encrypted files the CLI seals the file key to the grantee's on-chain public key. |
| `tx access revoke <root> [grantee] [--grant-id N]` | revoke (owner only) |
| `tx ibc-lab mint-voucher <to> <denom> <amount>` | lab mode only; refused by public nodes without the admin token |

## Read tokens and decryption

```bash
vaultd read-token <root> --provider <provider address> --from me [--ttl 10m]   # max 1h
vaultd decrypt <root> --in file.vle --out file.bin --from me --node <REST>
```

`read-token` prints a token for [`Authorization: Vault <token>`](/docs/reference/provider-api#reading). `decrypt` opens the key envelope for `--from` (owner or grantee), then decrypts a downloaded ciphertext, releasing plaintext only if every segment authenticates.

## Example session

```bash
V=./build/vaultd; NODE=https://vaultl1-devnet.fly.dev; PROV=https://vaultl1-provider.fly.dev
$V tx storage commit-manifest ./secret.pdf --encrypt --cipher-out ./secret.vle --from me --node $NODE
# (the output includes the root and the ciphertext size)
$V tx storage open-deal market <root> 0 - 10000 uvault --from me --node $NODE
curl -X POST --data-binary @secret.vle $PROV/v1/objects/<root>
TOKEN=$($V read-token <root> --provider <provider address> --from me)
curl -H "Authorization: Vault $TOKEN" $PROV/v1/objects/<root> -o dl.vle
$V decrypt <root> --in dl.vle --out secret.pdf --from me --node $NODE
```
