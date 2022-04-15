import { SendTransactionOptions } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Transaction, Keypair } from "@solana/web3.js";

export const useTransaction = () => {
  const { sendTransaction } = useWallet();
  const sendTransactionConfirmed = async (
    transaction: Transaction,
    connection: Connection,
    options?: SendTransactionOptions
  ) => {
    const tsx = await sendTransaction(transaction, connection, options);
    const confirmation = await connection.confirmTransaction(tsx, "confirmed");

    return { tsxId: tsx, confirmation };
  };
  return { sendTransactionConfirmed };
};
