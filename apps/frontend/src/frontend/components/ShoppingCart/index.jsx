import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { SHOPPING_TYPES } from '../../constants';
import Switch from '../Switch';
import { getCart, getUserFavorites } from '../../store/selectors';
import CartItem from './CartItem';
import { updateCart, updateFavorites } from '../../store/actionCreators';

const ScShoppingCart = styled.div`
  margin: 0 auto;
  height: 100%;
  width: 100%;
  padding: 2%;
  @media screen and (max-width: 768px) {
    padding: 16px 24px;
  }
  max-width: 800px;
  display: flex;
  flex-direction: column;
  .switch-container {
    margin: 20px auto;
  }
  .title {
    align-self: flex-start;
    font-size: 36px;
    @media screen and (max-width: 768px) {
      font-size: 28px;
    }
  }
  .nfts-container {
    display: flex;
    flex-direction: column;
  }
`;

const ShoppingCart = () => {
  const userFavorites = useSelector(getUserFavorites);
  const cart = useSelector(getCart);
  const dispatch = useDispatch();

  const [selectedTab, setSelectedTab] = useState(SHOPPING_TYPES.CART);
  const listedItems = selectedTab === SHOPPING_TYPES.CART ? cart : userFavorites;

  const handleRemoveFromList = async (e, cid) => {
    e.stopPropagation();
    if (selectedTab === SHOPPING_TYPES.CART) {
      dispatch(updateCart(cid));
    } else {
      dispatch(updateFavorites(cid));
    }
  };

  return (
    <ScShoppingCart>
      <div className="switch-container">
        <Switch keys={Object.values(SHOPPING_TYPES)} selected={selectedTab} onChange={setSelectedTab} />
      </div>
      <h1 className="title">Your {selectedTab}</h1>
      <div className="nfts-container">
        {listedItems.map(cid => (
          <CartItem key={cid} cid={cid} onRemoveFromList={e => handleRemoveFromList(e, cid)} />
        ))}
      </div>
    </ScShoppingCart>
  );
};

export default ShoppingCart;