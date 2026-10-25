---
title: Getting started
section: Start
order: 1
description: What VaultChain is, what you can do on the devnet today, and the fastest way to store your first file.
---

# Getting started

VaultChain is an experimental storage chain. Your files are encrypted on your device, split into chunks, and kept by independent storage **providers**. A small public ledger records who agreed to store what, pays for it, and regularly asks providers to prove they still hold the data.

> **Devnet only.** The public network is a single validator plus one provider, run for testing. Its state can be reset at any time, tokens have no value, and the code is not audited. Do not store anything you cannot afford to lose. See the [threat model](/docs/concepts/threat-model) and [roadmap](/docs/roadmap).

## What is live

| Piece | Where | Notes |
| --- | --- | --- |
| Chain | `https://vaultl1-devnet.fly.dev` | chain id `vault-devnet-1`, one validator, a block about every 3 seconds |
| Storage provider | `https://vaultl1-provider.fly.dev` | one provider, 700 MB of capacity |
| Web vault | [/vault](/vault) | profiles, keys and files, all in your browser |
| Explorer | [vaultchain-explorer.vercel.app](https://vaultchain-explorer.vercel.app) | read-only view of providers, deals and files |

The native token is `uvault` (1 VAULT = 1,000,000 uvault) and addresses start with `vault1...`.

## Store a file in the browser

1. Open the [vault](/vault) and create a profile. Choose a passphrase you will not forget: it encrypts your private key on this device, and nobody can reset it.
2. Copy your `vault1...` address. The devnet has no public faucet, so you need someone with devnet funds to send you some `uvault`. A small file costs two transaction fees (1,000 uvault each) plus the deal payment: 10 VAULT for the app's default 10,000-block deal.
3. Choose a file, leave **Encrypt in this browser** on, and upload. The app signs two transactions (commit the manifest, open the deal), sends the chunks to the provider, and waits until the provider holds the complete object.
4. Under **My files** you can watch the deal turn from `pending` to `open`, see each replica's last proven block, download and decrypt, or share with another address.

Read [Using the web vault](/docs/guides/web-vault) for details and limits.

## Use the command line

Build `vaultd` from the [repository](https://github.com/VaultChainHQ/vaultchain) and point it at the devnet:

```bash
git clone https://github.com/VaultChainHQ/vaultchain && cd vaultchain
go build -o build/vaultd ./cmd/vaultd
NODE=https://vaultl1-devnet.fly.dev
PROVIDER=https://vaultl1-provider.fly.dev

./build/vaultd keys add me --home ~/.vaultl1-me                 # prints your vault1... address
./build/vaultd query providers --node $NODE                     # who can store data right now

# 1. publish the manifest (chunking and the Merkle root are computed locally; --encrypt is optional)
./build/vaultd tx storage commit-manifest ./photo.jpg --from me --home ~/.vaultl1-me --node $NODE
# 2. open a 10,000-block deal; the second-to-last argument is the duration (size 0 = manifest size)
./build/vaultd tx storage open-deal market <root> 0 - 10000 uvault --from me --home ~/.vaultl1-me --node $NODE
# 3. upload the bytes; the provider verifies them against the root, accepts the deal and starts proving
curl -X POST --data-binary @photo.jpg $PROVIDER/v1/objects/<root>
```

The full command list is in the [CLI reference](/docs/reference/cli).

## Talk to the API

The node's REST API allows any origin, so you can query it from a script or a web page:

```bash
curl -s https://vaultl1-devnet.fly.dev/cosmos/base/tendermint/v1beta1/node_info
curl -s https://vaultl1-devnet.fly.dev/vaultchain/storage/params
```

See the [node REST reference](/docs/reference/node-rest) and the [provider API](/docs/reference/provider-api).

## Where to go next

- How a file becomes a deal: [storage classes and deals](/docs/concepts/storage-classes-and-deals), [chunking and Merkle roots](/docs/concepts/chunking-and-merkle-roots).
- How the network checks providers: [proofs and slashing](/docs/concepts/proofs-and-slashing), [replication and repair](/docs/concepts/replication-and-repair).
- Privacy: [access and encryption](/docs/concepts/access-and-encryption).
- Run your own: [run a node](/docs/guides/run-a-node), [run a provider](/docs/guides/run-a-provider).
