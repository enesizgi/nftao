import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { ethers } from 'ethers';
import sortedUniqBy from 'lodash/sortedUniqBy';
// import { useSelector } from 'react-redux';
import { setUser } from './userSlice';
import API from '../modules/api';
import { generateSignatureData } from '../utils';
import { setChainID, setIsLoadingContracts } from './marketplaceSlice';
import { setProfile } from './profileSlice';
import { loadNFT, setCurrentPath, setIsLoading } from './uiSlice';
// import { getMarketplaceContract } from './selectors';
import { NFT_ACTIVITY_TYPES } from '../constants';
import { getMarketplaceContractFn, getNFTContractFn } from '../components/utils';
import { setNFT } from './nftSlice';
// import { getMarketplaceContractFn } from '../components/utils';

/* eslint-disable */
const listenerMiddleware = createListenerMiddleware();

const userLoginFlow = async (id, listenerApi) => {
  const userExists = await API.checkUser(id);

  if (!userExists) {
    const { signature, message } = await generateSignatureData();
    const createdUser = await API.createUser(id, signature, message);
    if (!createdUser) {
      console.warn('User could not be created.');
    } else {
      const { slug, name } = createdUser;
      listenerApi.dispatch(setUser({ id, slug, name }));
    }
  } else {
    const userInfo = await API.getUser(id);
    listenerApi.dispatch(setUser(userInfo));
  }
};

const handleInitMarketplace = async (action, listenerApi) => {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const id = accounts[0];
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  listenerApi.dispatch(setChainID(chainId));

  await userLoginFlow(id, listenerApi);

  window.ethereum.on('chainChanged', chainID => {
    listenerApi.dispatch(setChainID(chainID));
  });

  // eslint-disable-next-line
  window.ethereum.on('accountsChanged', async accounts => {
    const newAccountID = accounts[0];
    await userLoginFlow(newAccountID, listenerApi);
    await handleInitMarketplace(action, listenerApi);
  });

  listenerApi.dispatch(setIsLoadingContracts(false));
};

const handleInitProfile = async (action, listenerApi) => {
  const path = action.payload;
  const getUserRequest = path.startsWith('0x') ? API.getUser : API.getUserBySlug;
  const response = await getUserRequest(path);
  listenerApi.dispatch(setProfile(response));
};

const handleInitNFTState = async (listenerApi, tokenID) => {
  const {
    user: { id: userID },
    marketplace: { chainID, defaultChainID }
  } = listenerApi.getState();

  const marketplaceContract = await getMarketplaceContractFn(userID, chainID, defaultChainID);
  const nftContract = await getNFTContractFn(userID, chainID, defaultChainID);
  const _nftOwner = await nftContract.ownerOf(tokenID);
  const owner = _nftOwner.toLowerCase();
  const uri = await nftContract.tokenURI(tokenID);
  const cid = uri.split('ipfs://')[1];
  const metadata = await API.getFromIPFS(cid);

  // TODO: Cache mechanism for transactions maybe?
  const transferFilter = nftContract.filters.Transfer(ethers.constants.AddressZero, null, tokenID);
  const transferEvents = await nftContract.queryFilter(transferFilter);

  const boughtFilter = marketplaceContract.filters.Bought(null, null, tokenID, null, null, null);
  const boughtResults = await marketplaceContract.queryFilter(boughtFilter);
  const offeredFilter = marketplaceContract.filters.Offered(null, null, tokenID, null, null);
  const offeredResults = await marketplaceContract.queryFilter(offeredFilter);
  const auctionFilter = marketplaceContract.filters.AuctionStarted(null, null, tokenID, null, null, null);
  const auctionResults = await marketplaceContract.queryFilter(auctionFilter);
  const auctionEndedFilter = await marketplaceContract.filters.AuctionEnded(null, null, tokenID, null, null, null);
  const auctionEndedResults = await marketplaceContract.queryFilter(auctionEndedFilter);

  // const sortedEvents = [...offeredResults, ...auctionResults].sort((a, b) => b.blockNumber - a.blockNumber);
  const sortedEventsForActivity = [...boughtResults, ...auctionEndedResults].sort((a, b) => b.blockNumber - a.blockNumber);
  const allEvents = [...offeredResults, ...auctionResults, ...boughtResults, ...auctionEndedResults].sort((a, b) => b.blockNumber - a.blockNumber);
  const allUniqueEvents = sortedUniqBy(allEvents, e => e.args.tokenId.toBigInt());
  const lastEvent = allUniqueEvents[0];

  let i;
  let totalPrice;

  const itemId = lastEvent?.args?.itemId;
  const auctionId = lastEvent?.args?.auctionId;

  if (itemId) {
    i = await marketplaceContract.items(itemId);
    totalPrice = await marketplaceContract.getTotalPrice(itemId);
    i = i.itemId && !i.sold && i;
  } else if (auctionId) {
    i = await marketplaceContract.auctionItems(auctionId);
    i = i.auctionId && !i.claimed && i;
  }
  // TODO: handle if data comes from ipfs
  const it = {
    ...metadata,
    tokenId: tokenID,
    ...(itemId ? { itemId: parseInt(itemId._hex, 16) } : {}),
    ...(i ?? {}),
    ...(totalPrice ? { totalPrice } : {}),
    ...(i?.price ? { price: i.price } : {})
  };
  // console.log(Object.entries(it));
  const finalItem = Object.entries(it).reduce((acc, [key, value]) => {
    return ethers.BigNumber.isBigNumber(value) ? { ...acc, [key]: parseInt(value._hex, 16) } : { ...acc, [key]: value };
  }, {});
  // console.log(it2);
  // console.log(ethers.BigNumber.isBigNumber(it.itemId));

  const nftTransactionData = sortedEventsForActivity.map(e => ({
    type: NFT_ACTIVITY_TYPES.SALE,
    price: ethers.utils.formatEther(e.args.price),
    from: e.args.seller,
    to: e.args.buyer
  }));
  nftTransactionData.push({ type: NFT_ACTIVITY_TYPES.MINT, price: '', from: 'Null', to: transferEvents[0].args.to });

  const isNFTOwnedByMarketplace = owner === marketplaceContract.address.toLowerCase();
  const isListed = isNFTOwnedByMarketplace && lastEvent.event === 'Offered';
  const isOnAuction = isNFTOwnedByMarketplace && lastEvent.event === 'AuctionStarted';

  const seller = isListed || isOnAuction ? lastEvent.args.seller.toLowerCase() : '';
  console.log({ finalItem });

  listenerApi.dispatch(setNFT({ ...finalItem, transactions: nftTransactionData, owner, seller, isListed, isOnAuction }));
};

const handlePathChanges = async (action, listenerApi) => {
  const pathName = window.location.pathname;
  const isInNFTPage = pathName.startsWith('/nft/');
  // const isInProfilePage = pathName.startsWith('/profile/');

  if (isInNFTPage) {
    const tokenID = pathName.split('/')[3];
    listenerApi.dispatch(setIsLoading(true));
    await handleInitNFTState(listenerApi, tokenID);
    listenerApi.dispatch(setIsLoading(false));
  }
};

listenerMiddleware.startListening({
  type: 'INIT_MARKETPLACE',
  effect: handleInitMarketplace
});

listenerMiddleware.startListening({
  type: 'INIT_PROFILE',
  effect: handleInitProfile
});

listenerMiddleware.startListening({
  matcher: isAnyOf(setCurrentPath, loadNFT),
  effect: handlePathChanges
});

export default listenerMiddleware;
