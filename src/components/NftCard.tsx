import { INFT } from "utils/web3/NFTget";

interface NftCardProps {
  metaData: INFT;
  isSelected?: boolean;
  onClick?: (mint: string) => void;
  disabled?: boolean;
}

export const NftCard = ({
  metaData,
  isSelected,
  onClick,
  disabled,
}: NftCardProps) => {
  const { externalMetadata, mint } = metaData;
  return (
    <li
      onClick={() => onClick && onClick(mint.toBase58())}
      className={`flex flex-col rounded-md ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } shadow-lg text-neutral-content p-2 ${
        !disabled && isSelected ? "bg-blue-500" : "bg-neutral"
      }`}
    >
      <img src={externalMetadata?.image} className="h-100 w-100 flex-1" />
      <p className="p-2 text-white">{externalMetadata?.name}</p>
    </li>
  );
};
