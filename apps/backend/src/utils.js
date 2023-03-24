import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { CONTRACTS, NETWORK_IDS } from 'contracts';
import mongoose from 'mongoose';
import Event from './models/event';
import Price from './models/price';
import NftStatus from './models/nft_status';

export const verifyMessage = async (req, res, next) => {
  try {
    if (!req.query.message || !req.query.signature) {
      return res.status(400).send('Missing message or signature');
    }
    const recoveredAddress = await ethers.utils.verifyMessage(req.query.message, req.query.signature);
    const messageCreationDate = new Date(req.query.message.split(' ').pop());
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    if (messageCreationDate < oneDayAgo) {
      return res.status(401).send('Message expired');
    }
    if (recoveredAddress.toLowerCase() !== req.query.id.toLowerCase()) {
      return res.status(401).send('Message could not verified');
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
  return next();
};

export const getLastStatusOfNft = async events => {
  const { insertEvents, updateEvents } = events.reduce(
    (acc, event) => {
      switch (event.type) {
        case 'Offered':
          acc.insertEvents.push({
            type: 'Listing',
            itemId: event.itemId,
            nft: event.nft,
            marketplaceContract: event.marketplaceContract,
            tokenId: event.tokenId,
            price: event.price,
            seller: event.seller,
            network: event.network,
            sold: false,
            canceled: false
          });
          return acc;
        case 'Bought':
          acc.updateEvents.push({
            updateOne: {
              filter: { type: 'Listing', itemId: event.itemId, network: event.network, marketplaceContract: event.marketplaceContract },
              update: { $set: { buyer: event.buyer, sold: true } }
            }
          });
          return acc;
        case 'AuctionStarted':
          acc.insertEvents.push({
            type: 'Auction',
            auctionId: event.auctionId,
            nft: event.nft,
            marketplaceContract: event.marketplaceContract,
            tokenId: event.tokenId,
            price: event.price,
            timeToEnd: event.timeToEnd,
            seller: event.seller,
            network: event.network,
            claimed: false,
            canceled: false
          });
          return acc;
        case 'AuctionEnded':
          acc.updateEvents.push({
            updateOne: {
              filter: { type: 'Auction', auctionId: event.auctionId, network: event.network, marketplaceContract: event.marketplaceContract },
              update: { $set: { winner: event.winner, claimed: true } }
            }
          });
          return acc;
        case 'OfferCanceled':
          acc.updateEvents.push({
            updateOne: {
              filter: { type: 'Listing', itemId: event.itemId, network: event.network, marketplaceContract: event.marketplaceContract },
              update: { $set: { canceled: true } }
            }
          });
          return acc;
        case 'AuctionCanceled':
          acc.updateEvents.push({
            updateOne: {
              filter: { type: 'Auction', auctionId: event.auctionId, network: event.network, marketplaceContract: event.marketplaceContract },
              update: { $set: { canceled: true } }
            }
          });
          return acc;
        default:
          console.warn(`Unknown event type: ${event.type}`);
          return null;
      }
    },
    { insertEvents: [], updateEvents: [] }
  );
  await NftStatus.insertMany(insertEvents.filter(i => i));
  await NftStatus.bulkWrite(updateEvents.filter(i => i));
};

export const fetchMarketplaceEvents = async chainId => {
  let insertData = [];
  try {
    dotenv.config();
    const isLocalhost = chainId === NETWORK_IDS.LOCALHOST;
    const maxBlockNumber = await Event.find().sort({ blockNumber: -1 }).limit(1).lean();
    const fromBlock = !isLocalhost && maxBlockNumber[0] ? maxBlockNumber[0].blockNumber + 1 : 0;
    const provider = isLocalhost
      ? new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
      : new ethers.providers.EtherscanProvider(Number(chainId), process.env.ETHERSCAN_API_KEY);
    const marketplaceContract = new ethers.Contract(CONTRACTS[chainId].MARKETPLACE.address, CONTRACTS[chainId].MARKETPLACE.abi, provider);
    const events = await marketplaceContract.queryFilter('*', fromBlock);
    // console.log(events);
    insertData = events.map(event => {
      const {
        blockNumber,
        transactionIndex,
        transactionHash,
        event: type,
        args: { itemId, auctionId, nft, price, tokenId, seller, buyer, timeToEnd }
      } = event;
      return {
        type,
        ...(itemId ? { itemId: ethers.BigNumber.from(itemId).toNumber() } : {}),
        ...(auctionId ? { auctionId: ethers.BigNumber.from(auctionId).toNumber() } : {}),
        nft,
        marketplaceContract: CONTRACTS[chainId].MARKETPLACE.address,
        ...(price ? { price: ethers.BigNumber.from(price).toString() } : {}),
        ...(tokenId ? { tokenId: ethers.BigNumber.from(tokenId).toNumber() } : {}),
        seller,
        ...(buyer ? { buyer } : {}),
        ...(timeToEnd ? { timeToEnd: new Date(ethers.BigNumber.from(timeToEnd).toNumber() * 1000) } : {}),
        blockNumber,
        transactionIndex,
        transactionHash,
        network: chainId
      };
    });
    if (isLocalhost) {
      const session = await mongoose.startSession();
      session.startTransaction();
      await Event.deleteMany({ network: chainId });
      await NftStatus.deleteMany({ network: chainId });
      await Promise.all([Event.insertMany(insertData), getLastStatusOfNft(insertData)]);
      await session.commitTransaction();
      session.endSession();
    } else {
      await Promise.all([Event.insertMany(insertData), getLastStatusOfNft(insertData)]);
    }
  } catch (err) {
    console.log(err);
  }
  return insertData;
};

export const fetchEthPrice = async () => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    await Price.findOneAndUpdate({ coin: 'Ethereum', symbol: 'ETH', currency: 'USD' }, { $set: { price: +data.ethereum.usd } }, { upsert: true });
  } catch (err) {
    console.log(err);
  }
};
