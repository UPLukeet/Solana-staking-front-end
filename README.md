# Introduction

This is a front-end framework built using Next.js and Gemworks.

This project includes:

- Next.JS
- TypeScript
- [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter) and [@solana/web3.js](https://solana-labs.github.io/solana-web3.js) for interactions with wallets & blockchain.
- Tailwind CSS (with [daisyUI](https://daisyui.com/))
- Gemworks

## Getting Started

First, run the development server:

```bash
yarn
yarn run dev
```

# Setting up staking farm

Set up your farm using the farm manager below.
https://www.gemfarm.gg/manager
Make sure reward A is your chosen reward if you only want one reward type pass this as reward B So11111111111111111111111111111111111111112.

To add your farm to the Next.js front-end simply create a .env file at the root of the project.
Add a variable inside the file called NEXT_PUBLIC_FARM_PUBLICKEY=YOUR_GEMFARM_PUBLICKEY_GOES_HERE.
