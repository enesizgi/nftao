import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import OnOutsideClick from 'react-outclick';
import CoolButton from './CoolButton';
import { ReactComponent as PolygonLogo } from '../../assets/polygon-logo.svg';
import EthereumLogo from '../../assets/ethereum-logo.png';
import HardhatLogo from '../../assets/hardhat-logo.png';
import { CHAIN_PARAMS, defaultChainId, DEVICE_TYPES, NETWORK_LOGOS } from '../../constants';
import { getChainIdWithDefault, getDeviceType, getUserId } from '../../store/selectors';
import Dropdown from '../Dropdown';
import { setChainId } from '../../store/marketplaceSlice';
import { changeNetwork } from '../../utils';

const ScNetworkSelector = styled.div`
  display: flex;
  align-items: center;
  position: relative;

  .title-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    position: relative;
    div {
      border-radius: 8px;
    }
    &-title {
      .network-name {
        margin-left: 8px;
      }
    }
  }

  svg,
  img {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    @media screen and (max-width: 480px) {
      margin-right: 0;
    }
  }

  .dropdown-content {
    margin-top: 10px;
    position: absolute;
    top: 100%;
    right: 0;
  }
`;

const NetworkSelector = () => {
  const dispatch = useDispatch();
  const [isDropdownOpened, setDropdownOpened] = useState(false);
  const chainId = useSelector(getChainIdWithDefault);
  const deviceType = useSelector(getDeviceType);
  const userId = useSelector(getUserId);

  useEffect(() => {
    if (!sessionStorage.getItem('chainId')) {
      sessionStorage.setItem('chainId', defaultChainId);
    }
  }, []);

  // TODO @Enes: Reload homepage after changing network
  // TODO @Enes: Add localhost to networks
  const handleNetworkChange = networkId => async () => {
    if (!userId) {
      sessionStorage.setItem('chainId', networkId);
      dispatch(setChainId(networkId));
    } else if (window.ethereum) {
      await changeNetwork(networkId);
    }
    setDropdownOpened(false);
  };

  const { type: logoType, src: Logo } = NETWORK_LOGOS[chainId] || {};
  const isLocalhost = window.location.hostname === 'localhost';

  return (
    <ScNetworkSelector isDropdownOpened={isDropdownOpened}>
      <OnOutsideClick onOutsideClick={() => setDropdownOpened(false)}>
        <div className="title-container">
          <CoolButton className="title-container-title" onClick={() => setDropdownOpened(!isDropdownOpened)} isDropdownOpened={isDropdownOpened}>
            {logoType === 'svg' && <Logo />}
            {logoType && logoType !== 'svg' && <img src={Logo} alt="network logo" className="title-container-logo" />}
            {deviceType !== DEVICE_TYPES.MOBILE && <div className="network-name">{CHAIN_PARAMS[chainId]?.chainName ?? 'Unknown'}</div>}
          </CoolButton>
        </div>
        {isDropdownOpened && (
          <Dropdown>
            {isLocalhost && (
              <button type="button" className="dropdown-content-item" onClick={handleNetworkChange('0x7a69')}>
                <img src={HardhatLogo} alt="ethereum-logo" className="dropdown-content-item-icon" />
                <div className="dropdown-container-network-title">Localhost</div>
              </button>
            )}
            <button type="button" className="dropdown-content-item" onClick={handleNetworkChange('0xaa36a7')}>
              <img src={EthereumLogo} alt="ethereum-logo" className="dropdown-content-item-icon" />
              <div className="dropdown-container-network-title">Sepolia</div>
            </button>
            <button type="button" className="dropdown-content-item" onClick={handleNetworkChange('0x5')}>
              <img src={EthereumLogo} alt="ethereum-logo" className="dropdown-content-item-icon" />
              <div className="dropdown-container-network-title">Goerli</div>
            </button>
            <button type="button" className="dropdown-content-item" onClick={handleNetworkChange('0x89')}>
              <PolygonLogo className="dropdown-content-item-icon" />
              <div className="dropdown-container-network-title">Polygon</div>
            </button>
          </Dropdown>
        )}
      </OnOutsideClick>
    </ScNetworkSelector>
  );
};

export default NetworkSelector;
