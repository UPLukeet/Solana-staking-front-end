import { MintLayout } from "@solana/spl-token";

interface NftCardProps {
  metaData: any;
  isSelected?: boolean;
  onClick?: (mint: string) => void;
}

export const NftCard = ({ metaData, isSelected, onClick }: NftCardProps) => {
  const { name, image, mint } = metaData;
  return (
    <li
      onClick={() => onClick && onClick(mint)}
      className={`flex flex-col radius-m cursor-pointer ${
        isSelected && "bg-blue-500"
      }`}
    >
      <img src={image} className="h-100 w-100 flex-1" />
      <p>{name}</p>
    </li>
  );
};
