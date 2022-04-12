import { FC, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletNfts, WalletResult } from "@nfteyez/sol-rayz-react";
import styles from "./index.module.css";
import { FARM_PUBLICKEY, initGemFarm } from "utils/gem-farm";
import baseWallet, { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { findFarmerPDA, stringifyPKsAndBNs } from "@gemworks/gem-farm-ts";
import { Loader } from "components";
import { whiteList } from "../../../white-list";

export const HomeView: FC = ({}) => {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const wallet = {
    publicKey,
    sendTransaction,
    signTransaction,
  } as SignerWalletAdapter;
  const { nfts, isLoadingNfts, error } = useWalletNfts({
    publicAddress: publicKey,
    connection,
  });

  const [gf, setGf] = useState<any>();
  const whiteListNfts = isLoadingNfts
    ? []
    : nfts.filter((nft: any) => whiteList.includes(nft.mint));
  const farm = FARM_PUBLICKEY;

  const [farmAcc, setFarmAcc] = useState<any>();
  const [farmerIdentity, setFarmerIdentity] = useState<string>();
  const [farmerAcc, setFarmerAcc] = useState<any>();
  const [farmerState, setFarmerState] = useState<string>();
  const [availableRewards, setAvailableRewards] = useState();

  useEffect(() => {
    if (publicKey && connection) {
      (async () => {
        try {
          const gfResponse = await initGemFarm(connection, wallet);
          setGf(gfResponse);
          console.log("farm init success", gfResponse);
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (gf) {
      (async () => {
        try {
          await fetchFarm();
          await fetchFarmer();
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, [gf]);

  const initFarmer = async () => {
    await gf.initFarmerWallet(new PublicKey(farm));
    await fetchFarmer();
  };

  const fetchFarm = async () => {
    const farmAccResponse = await gf.fetchFarmAcc(new PublicKey(farm));
    setFarmAcc(farmAccResponse);
    console.log(`farm found at ${farm}:`, stringifyPKsAndBNs(farmAccResponse));
  };

  const fetchFarmer = async () => {
    const [farmerPDA] = await findFarmerPDA(
      new PublicKey(farm),
      publicKey as PublicKey
    );
    setFarmerIdentity(publicKey?.toBase58());
    const farmerAccResponse = await gf.fetchFarmerAcc(farmerPDA);
    setFarmerAcc(farmerAccResponse);
    setFarmerState(gf.parseFarmerState(farmerAccResponse));
    setAvailableRewards(
      farmerAccResponse.rewardA.accruedReward
        .sub(farmerAccResponse.rewardA.paidOutReward)
        .toString()
    );
    console.log(
      `farmer found at ${farmerIdentity}:`,
      stringifyPKsAndBNs(farmerAccResponse)
    );
  };

  return (
    <div className="container mx-auto max-w-6xl p-8 2xl:px-0">
      <div className={styles.container}>
        <div className="navbar mb-2 shadow-lg bg-neutral text-neutral-content rounded-box">
          <div className="flex-none">
            <button className="btn btn-square btn-ghost">
              <span className="text-4xl">🦤</span>
            </button>
          </div>
          <div className="flex-1 px-2 mx-2">
            <span className="text-lg font-bold">Caw Caw</span>
          </div>
          <div className="flex-none">
            <WalletMultiButton className="btn btn-ghost" />
          </div>
        </div>

        <div className="text-center pt-2">
          <div className="hero min-h-16 py-4">
            <div className="text-center hero-content">
              <div className="max-w-lg">
                {farmerAcc ? (
                  <div>
                    <p>account found</p>
                    {isLoadingNfts ? (
                      <Loader />
                    ) : (
                      whiteListNfts?.map((nft: any) => (
                        <p key={nft.mint}>{nft.mint}</p>
                      ))
                    )}
                  </div>
                ) : (
                  publicKey && (
                    <div>
                      <p>No account found</p>{" "}
                      <button onClick={initFarmer} className="btn btn-ghost">
                        Begin staking
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
