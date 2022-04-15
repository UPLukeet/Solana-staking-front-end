import { FC, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "./index.module.css";
import { FARM_PUBLICKEY, initGemFarm } from "utils/gem-farm";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { findFarmerPDA, stringifyPKsAndBNs } from "@gemworks/gem-farm-ts";
import { NftCard } from "components/NftCard";
import { initGemBank } from "utils/gem-bank";
import { BN } from "@project-serum/anchor";
import { getNFTMetadataForMany, getNFTsByOwner, INFT } from "utils/web3/NFTget";
import { useTransaction } from "utils/web3/sendTransactionConfirmed";

export const HomeView: FC = ({}) => {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { sendTransactionConfirmed } = useTransaction();
  const { connection } = useConnection();
  const wallet = {
    publicKey,
    sendTransaction,
    signTransaction,
  } as SignerWalletAdapter;

  const [gf, setGf] = useState<any>();
  const [gb, setGb] = useState<any>();

  const [whiteListNfts, setWhiteListNfts] = useState<INFT[]>([]);
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
  }, [publicKey, connection, vault]);

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
      if (vault && publicKey && connection) {
        const nftMetaData = await getNFTsByOwner(publicKey, connection);
        setWhiteListNfts(nftMetaData);
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

  const moveGems = async (intoVault: boolean) => {
    let newWhiteList = whiteListNfts;
    let newVault = vaultNfts;
    if (intoVault) {
      for (const nft of selectedNfts) {
        if (vaultNfts.find((vaultNft) => vaultNft.mint === nft)) return;

        const selectedNft = whiteListNfts.find(
          (whiteListedNft: INFT) => whiteListedNft.mint.toBase58() === nft
        );
        if (!selectedNft) return;

        const creator = new PublicKey(
          selectedNft?.onchainMetadata.data.creators[0].address
        );
        const programAccount = await connection.getTokenAccountsByOwner(
          publicKey as PublicKey,
          {
            mint: selectedNft.mint,
          }
        );
        const gemSource = programAccount.value[0].pubkey;

        await gb.depositGemWallet(
          bank,
          vault,
          new BN(1),
          new PublicKey(nft),
          gemSource,
          creator
        );
        newWhiteList = newWhiteList.filter(
          (nftToRemove) => nftToRemove.mint.toBase58() !== nft
        );
        newVault = [...newVault, selectedNft];

        setVaultNfts(newVault);
        setWhiteListNfts(newWhiteList);
        updateSelectedNfts(nft);
      }
    } else {
      for (const nft of selectedNfts) {
        if (
          whiteListNfts.find((whiteListNft: any) => whiteListNft.mint === nft)
        )
          return;
        const mint = new PublicKey(nft);
        await gb.withdrawGemWallet(bank, vault, new BN(1), mint);

        const selectedNft = vaultNfts.find(
          (vaulNft) => vaulNft.mint.toBase58() === nft
        );
        if (!selectedNft) return;

        newVault = newVault.filter(
          (nftToRemove) => nftToRemove.mint.toBase58() !== nft
        );
        newWhiteList = [...newWhiteList, selectedNft];

        setVaultNfts(newVault);
        setWhiteListNfts(newWhiteList);
        updateSelectedNfts(nft);
      }
    }
  };

  const stakeGems = async () => {
    const tsx = await gf.stakeNfts(bank, vault, new PublicKey(farm));
    const result = await sendTransactionConfirmed(tsx, connection);

    console.log("deposited ", result);
    await fetchFarmer();
  };

  const endStaking = async () => {
    let newWhiteList = whiteListNfts;
    let newVault = vaultNfts;
    const tsx = await gf.unstakeNfts(bank, vault, new PublicKey(farm));
    const result = await sendTransactionConfirmed(tsx, connection);

    console.log("unstaked ", result);

    for (const nft of vaultNfts) {
      await gb.withdrawGemWallet(bank, vault, new BN(1), nft.mint);

      newVault = newVault.filter(
        (nftToRemove) => nftToRemove.mint.toBase58() !== nft.mint.toBase58()
      );
      newWhiteList = [...newWhiteList, nft];

      setVaultNfts(newVault);
      setWhiteListNfts(newWhiteList);
    }
    await fetchFarmer();
  };

  const updateSelectedNfts = (mint: string) => {
    if (selectedNfts.includes(mint)) {
      setSelectedNfts((prev) => prev.filter((nft) => nft !== mint));
    } else {
      setSelectedNfts((prev) => [...prev, mint]);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-8 h-full">
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

        <div className="h-full">
          {farmerAcc ? (
            <div className="h-full">
              <div className="flex w-full h-full justify-between">
                <ul className="grid grid-cols-2 gap-8 sm:grid-cols-3 mt-4 p-5">
                  {whiteListNfts?.map((nft) => (
                    <NftCard
                      onClick={(mint) => updateSelectedNfts(mint)}
                      isSelected={selectedNfts?.includes(nft?.mint?.toBase58())}
                      key={nft?.mint?.toBase58()}
                      metaData={nft}
                    />
                  ))}
                </ul>
                <div className="flex flex-col p-5 m-auto">
                  <button
                    disabled={
                      !whiteListNfts.find((nft) =>
                        selectedNfts.includes(nft.mint.toBase58())
                      )
                    }
                    onClick={() => moveGems(true)}
                    className="btn btn-ghost mb-5"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="black"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  <button
                    disabled={
                      !(
                        vaultNfts.find((nft) =>
                          selectedNfts.includes(nft.mint.toBase58())
                        ) && farmerState === "unstaked"
                      )
                    }
                    onClick={() => moveGems(false)}
                    className="btn btn-ghost"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="black"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-8 sm:grid-cols-3 mt-4 p-5">
                  {vaultNfts?.map((nft) => (
                    <NftCard
                      onClick={(mint) => updateSelectedNfts(mint)}
                      isSelected={selectedNfts?.includes(nft?.mint?.toBase58())}
                      key={nft?.mint?.toBase58()}
                      metaData={nft}
                    />
                  ))}
                </ul>
              </div>
              <div className="flex mx-auto">
                {(farmerState === "staked" ||
                  farmerState === "pendingCooldown") && (
                  <>
                    <button onClick={endStaking} className="btn btn-ghost">
                      End Staking
                    </button>
                  </>
                )}
                {vaultNfts.length > 0 && farmerState === "unstaked" && (
                  <button onClick={stakeGems}>Stake NFTs</button>
                )}
              </div>
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
  );
};
