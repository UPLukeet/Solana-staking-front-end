import { MintLayout } from "@solana/spl-token";
import { INFT } from "utils/web3/NFTget";

interface NftCardProps {
  metaData: INFT;
  isSelected?: boolean;
  onClick?: (mint: string) => void;
}

export const NftCard = ({ metaData, isSelected, onClick }: NftCardProps) => {
  const { externalMetadata, mint } = metaData;
  return (
    <li
      onClick={() => onClick && onClick(mint.toBase58())}
      className={`flex flex-col rounded-md cursor-pointer shadow-lg text-neutral-content p-2 ${
        isSelected ? "bg-blue-500" : "bg-neutral"
      }`}
    >
      <img src={externalMetadata?.image} className="h-100 w-100 flex-1" />
      <p className="p-2">{externalMetadata?.name}</p>
    </li>
  );
};
