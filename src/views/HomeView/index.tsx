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
import { FarmInfo } from "components/FarmInfo";
import { NftGrid } from "components/NftGrid";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/solid";
import BapeImg from "../../assets/king-bape.png";

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
        if (farmerState === "staked") {
          await moveGemToStakedVault(selectedNft);
        } else {
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
        }
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

  const moveGemToStakedVault = async (selectedNft: INFT) => {
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
    const tsx = await gf.addToStaked(
      bank,
      vault,
      new PublicKey(farm),
      selectedNft.mint,
      gemSource,
      creator
    );
    const result = await sendTransactionConfirmed(tsx, connection);

    console.log("flash deposited ", result);
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
    const tsx = await gf.unstakeNfts(
      bank,
      vault,
      new PublicKey(farm),
      farmAcc.rewardA.rewardMint,
      farmAcc.rewardB.rewardMint
    );
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
    <div className="container mx-auto h-full p-5 sm:p-6 max-w-6xl">
      <div className={styles.container}>
        <div className="navbar mb-2 shadow-lg bg-wood text-neutral-content rounded-box p-2">
          <div className="flex-none">
            <button className="btn btn-square btn-ghost">
              <span className="text-4xl">
                <img src={BapeImg.src} className="rounded-lg" />
              </span>
            </button>
          </div>
          <div className="flex-1 px-2 mx-2 hidden sm:block">
            <span className="text-lg font-bold">BabyApes</span>
          </div>
          <div className="flex-none ml-auto">
            <WalletMultiButton className="btn bg-wood" />
          </div>
        </div>

        <div className="h-full mt-6">
          {farmerAcc ? (
            <div className="h-full">
              <div className="flex flex-col p-3 w-full h-full justify-between sm:flex-row  sm:my-20">
                <NftGrid heading="Un-staked">
                  {whiteListNfts?.map((nft) => (
                    <NftCard
                      onClick={(mint) => updateSelectedNfts(mint)}
                      isSelected={selectedNfts?.includes(nft?.mint?.toBase58())}
                      key={nft?.mint?.toBase58()}
                      metaData={nft}
                    />
                  ))}
                </NftGrid>
                <div className="flex p-3 m-auto sm: sm:flex-col">
                  <button
                    disabled={
                      !whiteListNfts.find((nft) =>
                        selectedNfts.includes(nft.mint.toBase58())
                      )
                    }
                    onClick={() => moveGems(true)}
                    className={`btn bg-neatral m-2`}
                  >
                    <ChevronDownIcon className="w-6 h-6 sm:hidden" />
                    <ChevronRightIcon className="w-6 h-6 hidden sm:block" />
                  </button>

                  <button
                    disabled={
                      !vaultNfts.find((nft) =>
                        selectedNfts.includes(nft.mint.toBase58())
                      )
                    }
                    onClick={() => moveGems(false)}
                    className={`btn m-2 ${
                      vaultNfts.find((nft) =>
                        selectedNfts.includes(nft.mint.toBase58())
                      ) &&
                      farmerState === "Unstaked" &&
                      "bg-wood"
                    }`}
                  >
                    <ChevronUpIcon className="w-6 h-6 sm:hidden" />
                    <ChevronLeftIcon className="w-6 h-6 hidden sm:block" />
                  </button>
                </div>
                <NftGrid isStaked={farmerState === "staked"} heading="Staked">
                  {vaultNfts?.map((nft) => (
                    <NftCard
                      disabled={farmerState === "staked"}
                      onClick={(mint) => updateSelectedNfts(mint)}
                      isSelected={selectedNfts?.includes(nft?.mint?.toBase58())}
                      key={nft?.mint?.toBase58()}
                      metaData={nft}
                    />
                  ))}
                </NftGrid>
              </div>
              <FarmInfo
                onStakeClick={stakeGems}
                onUnstakeClick={endStaking}
                vaultNfts={vaultNfts}
                farmerState={farmerState}
                farmer={farmerAcc}
                farm={farmAcc}
              />
            </div>
          ) : (
            publicKey && (
              <div className="flex flex-col bg-neutral rounded-lg p-4 m-auto text-center">
                <p className="p-3">No account found</p>
                <button onClick={initFarmer} className="btn btn-primary ">
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
