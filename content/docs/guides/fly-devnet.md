---
title: Fly.io devnet guide
section: Guides
order: 4
description: How the public devnet is deployed on Fly.io, what it costs, and the steps to deploy your own node and provider.
---

# Fly.io devnet guide

The public devnet is two small Fly.io apps: a **node** (`vaultl1-devnet`) and a **provider** (`vaultl1-provider`). You can deploy your own copies. The canonical, always-current runbook lives in [docs/FLY-DEVNET.md](https://github.com/VaultChainHQ/vaultchain/blob/master/docs/FLY-DEVNET.md); this page is a summary.

## What runs

| App | Role | Size | Notes |
| --- | --- | --- | --- |
| `vaultl1-devnet` | `vaultd` timer engine, REST on 443, 3 s blocks | shared-cpu-1x, 256 MB, 1 GB volume | RPC stays on loopback; machine auto-stop is off |
| `vaultl1-provider` | `vault-provider`, serves objects, proves | shared-cpu-1x, 256 MB, 1 GB volume | key generated on the volume; registers itself once funded |

Both are in region `iad`. Running both costs roughly USD 4 to 6 a month. The node is a single-writer chain, so run exactly one machine (`--ha=false`).

## Deploy the node

App names are global on Fly, so pick your own and edit `app =` in the toml files (and `DEVNET_REST` / `PUBLIC_URL` in `fly.provider.toml`) to match.

```bash
fly apps create my-vault-devnet
fly volumes create vaultd_data --app my-vault-devnet --region iad --size 1 --yes
fly deploy -c fly.devnet.toml --ha=false
curl -s https://my-vault-devnet.fly.dev/cosmos/base/tendermint/v1beta1/node_info
```

On first boot the entrypoint runs `vaultd init`, creates a `validator` key on the volume (`/data/vaultd/keyring-test`) and funds it in genesis. Later boots skip genesis (marker file `.genesis-done`). Settings, as `[env]` in the toml or `fly secrets set`:

| Name | Default | Meaning |
| --- | --- | --- |
| `CHAIN_ID` | `vault-devnet-1` | chain id |
| `BLOCK_INTERVAL` | `3s` | block time |
| `VALIDATOR_FUNDS` | `100000000000000uvault` | genesis balance of the validator, the devnet's only source of funds |
| `MIN_FEE` | `1000uvault` | minimum fee the public REST admits |
| `TX_RATE_PER_MIN` | `60` | per-IP limit on `POST /vaultchain/txs` |
| `LAB_MODE` | `0` | `1` at first boot enables the lab-only voucher mint (fixed for the life of the chain) |
| `VAULT_ADMIN_TOKEN` | unset | secret; even on a lab-mode chain, the public REST refuses lab messages without it |

## Deploy a provider

```bash
fly apps create my-vault-provider
fly volumes create provider_data --app my-vault-provider --region iad --size 1 --yes
fly deploy -c fly.provider.toml -a my-vault-provider --ha=false
fly logs -a my-vault-provider      # prints: provider address: vault1... then "waiting for funds"
```

`fly.provider.toml` points `DEVNET_REST` at the node over Fly's private network (`http://<node app>.internal:1317`). The advertised `PUBLIC_URL` defaults to `https://$FLY_APP_NAME.fly.dev`. To call the provider directly from a web page, set the secret `ALLOW_ORIGIN` (comma-separated origins); CORS is off otherwise.

The provider generates its own key on its volume. Fund it once from the validator account on the node machine (this needs `fly ssh console`):

```bash
fly ssh console -a my-vault-devnet -C "su-exec vault:vault vaultd tx bank-send <PROVIDER_ADDR> 5000000000uvault --from validator --home /data/vaultd --node http://127.0.0.1:1317 --fee 1000uvault"
```

Within about 10 to 20 seconds the provider registers itself with `COLLATERAL` (default 1,000,000,000 uvault) and `CAPACITY_BYTES` (default 700,000,000), then logs `is registered on chain`. Other optional settings: `FEE`.

More providers are the same file under different app names and volumes (`-a my-vault-provider-2`); each generates and funds its own key. Replication 2 needs two active providers with enough free space.

## Check your deployment

With a built `vaultd` and two funded keys you can run the end-to-end suites against it:

```bash
NODE=https://my-vault-devnet.fly.dev PROVIDER_URL=https://my-vault-provider.fly.dev ./scripts/e2e-remote.sh
./scripts/e2e-private.sh      # encryption, grant and revoke
```

`e2e-remote` (44/44 checks) and `e2e-private` (24/24) passed against the public devnet on 2026-10-25. The replication (11/11) and repair (15/15) scripts passed earlier on the previous chain against two extra providers that were later destroyed; the chain was reset on 2026-10-25 and only one provider is registered now. The scripts leave test files and deals behind on the network they run on.

## Operating notes

- **The node has no high availability.** If its volume is lost, the chain is lost. Take `fly volumes snapshots` or copy the data if the chain matters.
- The entrypoint starts the node with `--client-ip-header Fly-Client-IP`, so rate limits apply per client rather than per Fly proxy.
- The validator and provider keys are plain files on the volume. Anyone who can `fly ssh` into the app can read them.
- The public node refuses any transaction paying less than `MIN_FEE` (1000 uvault).
