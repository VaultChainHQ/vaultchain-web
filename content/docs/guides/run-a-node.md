---
title: Run a node
section: Guides
order: 2
description: Build vaultd, initialize a local chain, start the node and talk to it. Optionally run several validators with CometBFT.
---

# Run a node

You need Go 1.25 (the module declares 1.25.9) and a few minutes. A local chain is a good way to learn the system; it shares nothing with the public devnet.

## Build

```bash
git clone https://github.com/VaultChainHQ/vaultchain && cd vaultchain
go build -o build/vaultd ./cmd/vaultd
go build -o build/vault-provider ./tools/vault-provider
```

## Initialize and start a single node

```bash
./scripts/init-vault-local.sh      # home ~/.vaultchain, chain id vault-local-1, funds a validator key and an alice key
./build/vaultd start --home ~/.vaultchain
```

Or by hand:

```bash
vaultd init my-node --home ~/.vaultchain --chain-id vault-local-1 --lab-mode
vaultd keys add validator --home ~/.vaultchain
vaultd genesis add-genesis-account "$(vaultd keys show validator --home ~/.vaultchain)" 100000000000uvault --home ~/.vaultchain
vaultd start --home ~/.vaultchain
```

`--lab-mode` is fixed at genesis and enables only the `ibc-lab mint-voucher` message. Leave it off for anything public.

The node serves REST on `127.0.0.1:1317` and RPC on `127.0.0.1:26657` by default. The RPC is for the CLI and the provider; do not expose it publicly.

## Check it is alive

```bash
vaultd query providers
curl -s http://127.0.0.1:1317/cosmos/base/tendermint/v1beta1/node_info
```

## Useful `start` flags

| Flag | Meaning |
| --- | --- |
| `--block-interval` | block time for the timer engine (default `2s`) |
| `--min-fee 1000uvault` | refuse transactions below this fee |
| `--tx-rate 60` | limit `POST /vaultchain/txs` per client IP per minute |
| `--client-ip-header Fly-Client-IP` | trust this proxy header for the real client IP |
| `--rpc-addr`, `--api-addr` | listen addresses |
| `--consensus timer\|comet` | the engine; see below |

## Several validators with CometBFT

```bash
vaultd testnet --validators 4 --chain-id vault-devnet-2 --out build/testnet
scripts/comet-local.sh             # runs them on one machine
```

Each validator gets a funded account, a consensus key and a `persistent_peers.txt`. Start every node with `vaultd start --consensus comet --home <dir> --persistent-peers ...`. Validators have equal power fixed at genesis, with no staking. Three validators tolerate no failure and four tolerate one. See [consensus and state](/docs/concepts/consensus).

## Operate responsibly

- Back up `<home>/data` and the keyring. The CLI keyring (`keyring-test`) is **not encrypted**.
- The timer engine is a single point of failure.
- Put a reverse proxy with TLS in front of REST and set `--client-ip-header` so rate limiting sees real clients.
