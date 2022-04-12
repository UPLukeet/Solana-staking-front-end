interface NftCardProps {
  name: string;
  img: string;
}

export const NftCard = ({ name, img }: NftCardProps) => {
  return (
    <div className="flex flex-col radius-m">
      <p>{name}</p>
      <img src={img} className="h-100 w-100 flex-1" />
    </div>
  );
};
