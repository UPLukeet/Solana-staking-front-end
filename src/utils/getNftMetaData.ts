export const getNftMetaData = async (mint: string, uri: string) => {
  const response = await fetch(uri);
  const nftMetaData = await response.json();
  return { mint, ...nftMetaData };
};
