import * as mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    type: String,
    itemId: Number,
    auctionId: Number,
    nft: String,
    price: String,
    tokenId: Number,
    seller: String,
    buyer: String,
    timeToEnd: Date,
    blockNumber: Number,
    transactionIndex: Number,
    transactionHash: String,
    network: String
  },
  {
    typeKey: '$type',
    timestamps: { createdAt: 'doc_created_at', updatedAt: 'doc_updated_at' },
    strict: false
  }
);

const Event = mongoose.model('Event', EventSchema, 'events');

export default Event;
