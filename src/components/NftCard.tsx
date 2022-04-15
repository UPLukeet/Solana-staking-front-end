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
      className={`flex flex-col radius-m cursor-pointer ${
        isSelected && "bg-blue-500"
      }`}
    >
      <img src={externalMetadata.image} className="h-100 w-100 flex-1" />
      <p>{externalMetadata.name}</p>
    </li>
  );
};
