import { ethers } from 'ethers';
import { CONTRACTS } from 'contracts';
import { CHAIN_PARAMS, defaultChainId } from '../constants';
import API from '../modules/api';

export const getMarketplaceContractFn = (userId = window.sessionStorage.getItem('account'), chainId = window.sessionStorage.getItem('chainId')) => {
  let marketplaceContract;
  if (chainId && CONTRACTS[chainId]) marketplaceContract = CONTRACTS[chainId].MARKETPLACE;
  else marketplaceContract = CONTRACTS[defaultChainId].MARKETPLACE;
  if (userId && chainId) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer1 = provider.getSigner();
    return new ethers.Contract(marketplaceContract.address, marketplaceContract.abi, signer1);
  }
  const provider = new ethers.providers.JsonRpcProvider(CHAIN_PARAMS[chainId || defaultChainId].rpcUrls[0]);
  return new ethers.Contract(marketplaceContract.address, marketplaceContract.abi, provider);
};

export const getNFTContractFn = (userId = window.sessionStorage.getItem('account'), chainId = window.sessionStorage.getItem('chainId')) => {
  let nftContract;
  if (chainId && CONTRACTS[chainId]) nftContract = CONTRACTS[chainId].NFT;
  else nftContract = CONTRACTS[defaultChainId].NFT;
  if (userId && chainId) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer1 = provider.getSigner();
    return new ethers.Contract(nftContract.address, nftContract.abi, signer1);
  }
  const provider = new ethers.providers.JsonRpcProvider(CHAIN_PARAMS[chainId || defaultChainId].rpcUrls[0]);
  return new ethers.Contract(nftContract.address, nftContract.abi, provider);
};

export const getNFTMetadata = async tokenId => {
  const nftContract = await getNFTContractFn();
  const uri = await nftContract.tokenURI(tokenId);
  const cid = uri.split('ipfs://')[1];
  const m = await API.getFromIPFS(cid);
  return m || {};
};