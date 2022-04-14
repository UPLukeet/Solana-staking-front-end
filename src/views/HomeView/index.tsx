import { FC, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletNfts } from "@nfteyez/sol-rayz-react";
import styles from "./index.module.css";
import { FARM_PUBLICKEY, initGemFarm } from "utils/gem-farm";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction } from "@solana/web3.js";
import { findFarmerPDA, stringifyPKsAndBNs } from "@gemworks/gem-farm-ts";
import { Loader } from "components";
import { whiteList } from "../../../white-list";
import { NftCard } from "components/NftCard";
import { getNftMetaData } from "utils/getNftMetaData";
import { initGemBank } from "utils/gem-bank";
import { BN } from "@project-serum/anchor";
import { getNFTMetadataForMany, INFT } from "utils/web3/NFTget";

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
  const [gb, setGb] = useState<any>();

  const [whiteListNfts, setWhiteListNfts] = useState([]);
  const [vaultNfts, setVaultNfts] = useState<INFT[]>([]);
  const [selectedNfts, setSelectedNfts] = useState<any[]>([]);
  const farm = FARM_PUBLICKEY;

  const [vault, setVault] = useState();
  const [vaultAcc, setVaultAcc] = useState();
  const [bank, setBank] = useState();
  const [isBankLocked, setIsBankLocked] = useState();

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
          const gbResponse = await initGemBank(connection, wallet);
          setGf(gfResponse);
          setGb(gbResponse);
          console.log("farm init success", gfResponse);
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (gf && gb) {
      (async () => {
        try {
          await fetchFarm();
          await fetchFarmer();
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, [gf, gb]);

  useEffect(() => {
    if (vault)
      (async () => {
        await updateVaultState();
      })();
  }, [vault]);

  useEffect(() => {
    (async () => {
      await getNfts();
    })();
  }, [nfts, vault]);

  const initFarmer = async () => {
    try {
      await gf.initFarmerWallet(new PublicKey(farm));
      await fetchFarmer();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFarm = async () => {
    try {
      const farmAccResponse = await gf.fetchFarmAcc(new PublicKey(farm));
      setFarmAcc(farmAccResponse);
      console.log(
        `farm found at ${farm}:`,
        stringifyPKsAndBNs(farmAccResponse)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFarmer = async () => {
    try {
      const [farmerPDA] = await findFarmerPDA(
        new PublicKey(farm),
        publicKey as PublicKey
      );
      setFarmerIdentity(publicKey?.toBase58());
      const farmerAccResponse = await gf.fetchFarmerAcc(farmerPDA);
      setFarmerAcc(farmerAccResponse);
      setVault(farmerAccResponse.vault);
      setFarmerState(gf.parseFarmerState(farmerAccResponse));
      setAvailableRewards(
        farmerAccResponse.rewardA.accruedReward
          .sub(farmerAccResponse.rewardA.paidOutReward)
          .toString()
      );
      console.log(`farmer found :`, stringifyPKsAndBNs(farmerAccResponse));
    } catch (err) {
      console.error(console.error(err));
    }
  };

  const getNfts = async () => {
    try {
      if (vault && nfts) {
        const nftMetaData = await nfts
          .filter((nft: any) => whiteList.includes(nft.mint))
          .map(
            async (nft: any) => await getNftMetaData(nft.mint, nft.data.uri)
          );
        setWhiteListNfts(await Promise.all(nftMetaData));
        const foundGDRs = await gb.fetchAllGdrPDAs(vault);
        if (foundGDRs && foundGDRs.length > 0) {
          const mints = foundGDRs.map((gdr: any) => {
            return { mint: gdr.account.gemMint };
          });
          const vaultNftMetaData = await getNFTMetadataForMany(
            mints,
            connection
          );
          console.log("nft", await Promise.all(vaultNftMetaData));
          setVaultNfts(await Promise.all(vaultNftMetaData));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateVaultState = async () => {
    try {
      console.log("getting vault", vault);
      const vaultAccResponse = await gb.fetchVaultAcc(vault);
      setVaultAcc(vaultAccResponse);
      console.log("found vault :", vaultAccResponse);
      setBank(vaultAccResponse.bank);
      setIsBankLocked(vaultAccResponse.locked);
    } catch (err) {
      console.error(err);
    }
  };

  const stakeGems = async () => {
    const mints = await Promise.all(
      selectedNfts.map(async (nft) => {
        const selectedNft: any = nfts.find(
          (whiteListedNft: any) => whiteListedNft.mint === nft
        );
        if (!selectedNft) return;
        const mint = new PublicKey(selectedNft.mint);
        const creator = new PublicKey(selectedNft.data.creators[0].address);
        const programAccount = await connection.getTokenAccountsByOwner(
          publicKey as PublicKey,
          {
            mint,
          }
        );
        const gemSource = programAccount.value[0].pubkey;

        return { mint, gemSource, creator };
      })
    );

    const tsx = await gf.stakeMultipleNfts(bank, vault, mints);

    console.log(publicKey);
    const result = await sendTransaction(tsx, connection);

    console.log("deposited ", result);
    await gf.stakeWallet(new PublicKey(farm));
    await fetchFarmer();
    await getNfts();
  };

  const endStaking = async () => {
    await gf.unstakeWallet(new PublicKey(farm));

    for (const nft of vaultNfts) {
      await gb.withdrawGemWallet(bank, vault, new BN(1), nft.mint);
    }
    await fetchFarmer();
    await getNfts();
  };

  const updateSelectedNfts = (mint: string) => {
    console.log(mint);
    if (selectedNfts.includes(mint)) {
      const updatedArray = selectedNfts.filter((nft) => nft !== mint);
      setSelectedNfts(updatedArray);
    } else {
      setSelectedNfts((prev) => [...prev, mint]);
    }
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
                    <p>Send your Bapes into the jungle to mine for OOGIE!</p>
                    {isLoadingNfts ? (
                      <Loader />
                    ) : (
                      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 mt-4">
                        {whiteListNfts?.map((nft: any) => (
                          <NftCard
                            onClick={(mint) => updateSelectedNfts(mint)}
                            isSelected={selectedNfts.includes(nft.mint)}
                            key={nft.mint}
                            metaData={nft}
                          />
                        ))}
                      </ul>
                    )}
                    {selectedNfts.length > 0 && (
                      <button onClick={stakeGems} className="btn btn-ghost">
                        Stake NFT
                      </button>
                    )}
                    <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 mt-4">
                      {vaultNfts?.map((nft: any) => (
                        <NftCard
                          onClick={(mint) => updateSelectedNfts(mint)}
                          isSelected={selectedNfts.includes(
                            nft.mint.toBase58()
                          )}
                          key={nft.mint.toBase58()}
                          metaData={{
                            ...nft.externalMetadata,
                            mint: nft.mint.toBase58(),
                          }}
                        />
                      ))}
                    </ul>
                    {(farmerState === "staked" ||
                      farmerState === "pendingCooldown") && (
                      <>
                        <button onClick={endStaking} className="btn btn-ghost">
                          {farmerState === "staked"
                            ? "End Staking"
                            : "End cooldown"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  publicKey && (
                    <div>
                      <p>No account found</p>
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
