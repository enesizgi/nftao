import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import API from '../../modules/api';
import { ReactComponent as TrashIcon } from '../../assets/trash-icon.svg';
import { getMarketplaceContract } from '../../store/selectors';
import Shimmer from '../Shimmer';

const ScCartItem = styled.div`
  display: flex;
  width: 100%;
  margin: 15px 0;
  border-radius: 8px;
  padding-left: 10px;
  box-shadow: 0 0 6px #fff;
  cursor: pointer;
  overflow: hidden;
  ${({ isLoaded }) =>
    !isLoaded
      ? `
    height: 150px;
    padding-left: 0;
  `
      : ''}
  transition: .2s;
  &:hover {
    box-shadow: 0 0 10px #fff;
  }
  .nftImage {
    padding: 10px 0;
    align-self: center;
    width: 30%;
    margin-right: 20px;
    & > img {
      object-fit: contain;
    }
  }
  .nftInfo {
    padding: 10px 0;
    width: 50%;
    &-name {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      @media screen and (max-width: 480px) {
        font-size: 18px;
      }
    }
    &-description {
      font-size: 16px;
      @media screen and (max-width: 480px) {
        font-size: 12px;
      }
    }
  }
  .trash {
    align-self: center;
    width: 40px;
    height: 40px;
    padding: 8px;
    border-radius: 50%;
    margin-right: 10px;
    border: 3px solid red;
    box-shadow: 0 0 5px red;
    transition: 0.2s;
    @media screen and (max-width: 480px) {
      height: 100%;
      width: 30px;
      padding: 5px;
      border-radius: 0;
      border-bottom-right-radius: 8px;
      border-top-right-radius: 8px;
      margin-right: 0;
    }
    &:hover {
      background: red;
      box-shadow: 0 0 0;
    }
    margin-left: auto;
    & > svg {
      width: 100%;
      height: 100%;
      fill: #fff;
    }
  }
`;

const CartItem = ({ tokenId, onRemoveFromList }) => {
  const [nftInfo, setNftInfo] = useState();
  const marketplaceContract = useSelector(getMarketplaceContract);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      API.getNft({ tokenId }).then(res => setNftInfo(res));
    })();
  }, [tokenId]);

  const handleGoToNFTDetailPage = () => {
    navigate(`/nft/${marketplaceContract.address}/${tokenId}`);
  };

  return (
    <ScCartItem onClick={handleGoToNFTDetailPage} isLoaded={!!nftInfo}>
      {nftInfo ? (
        <>
          <div className="nftImage">
            <img alt="nftImage" src={nftInfo?.path} />
          </div>
          <div className="nftInfo">
            <h2 className="nftInfo-name">{nftInfo?.metadata?.name}</h2>
            <p className="nftInfo-description">{nftInfo?.metadata?.description}</p>
          </div>
          <button type="button" className="trash" onClick={onRemoveFromList}>
            <TrashIcon />
          </button>
        </>
      ) : (
        <Shimmer />
      )}
    </ScCartItem>
  );
};

export default CartItem;
