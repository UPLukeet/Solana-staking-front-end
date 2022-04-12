export const getNftMetaData = async (uri: string) => {
  const response = await fetch(uri);

  return await response.json();
};
