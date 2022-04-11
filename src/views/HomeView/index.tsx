import { FC, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletNfts } from "@nfteyez/sol-rayz-react";
import styles from "./index.module.css";
import { FARM_PUBLICKEY, initGemFarm } from "utils/gem-farm";
import baseWallet, { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { findFarmerPDA, stringifyPKsAndBNs } from "@gemworks/gem-farm-ts";

export const HomeView: FC = ({}) => {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const wallet = {
    publicKey,
    sendTransaction,
    signTransaction,
  } as SignerWalletAdapter;

  const [gf, setGf] = useState<any>();

  const farm = FARM_PUBLICKEY;
  const [farmAcc, setFarmAcc] = useState<any>();
  const [farmerIdentity, setFarmerIdentity] = useState<string>();
  const [farmerAcc, setFarmerAcc] = useState<any>();
  const [farmerState, setFarmerState] = useState<string>();
  const [availableRewards, setAvailableRewards] = useState();
  const { nfts, isLoading, error } = useWalletNfts({
    publicAddress: publicKey,
    connection,
  });

  console.log(nfts);
  useEffect(() => {
    if (publicKey && connection) {
      (async () => {
        try {
          setGf(await initGemFarm(connection, wallet));
          console.log("farm init success", gf);
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
    setFarmAcc(await gf.fetchFarmAcc(new PublicKey(farm)));
    console.log(`farm found at ${farm}:`, stringifyPKsAndBNs(farmAcc));
  };

  const fetchFarmer = async () => {
    const [farmerPDA] = await findFarmerPDA(
      new PublicKey(farm),
      publicKey as PublicKey
    );
    setFarmerIdentity(publicKey?.toBase58());
    const farmer = await gf.fetchFarmerAcc(farmerPDA);
    setFarmerAcc(farmer);
    setFarmerState(gf.parseFarmerState(farmer));
    setAvailableRewards(
      farmer.rewardA.accruedReward.sub(farmer.rewardA.paidOutReward).toString()
    );
    console.log(
      `farmer found at ${farmerIdentity}:`,
      stringifyPKsAndBNs(farmer)
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
                  <div> account found</div>
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
