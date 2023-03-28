import React, { useRef } from 'react';
import { node, func } from 'prop-types';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { ReactComponent as CloseIcon } from '../assets/close-icon-2.svg';
import { useClickOutsideAlert } from '../hooks';
import { classNames } from '../utils';
import LoadingSpinner from './LoadingSpinner';

const ScModal = styled.div`
  position: fixed;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  z-index: 1000;
  background-color: rgba(35, 37, 42, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;

  .modalContent {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 90%;
    margin: auto;
    padding: 60px 30px 27px;
    overflow: hidden;
    background: #fff;
    border-radius: 10px;
    position: relative;

    &.fullPage {
      height: 100vh;
      width: 100vw;
      padding: 78px 20px 27px;
      margin: 0;
    }

    > * {
      max-height: 100%;
      max-width: 100%;
    }
    @keyframes appear {
      0% {
        transform: scale(0);
      }
      50% {
        transform: scale(0.5);
      }
      100% {
        transform: scale(1);
      }
    }
    animation: 0.2s ease-in 1 appear;
    .modal-close {
      display: flex;
      justify-content: center;
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: #fff;
      border: 1px solid #fff;
      border-radius: 50%;
      padding: 7px;
      cursor: pointer;

      @media screen and (max-width: 768px) {
        left: 20px;
        right: 0;
        padding-left: 0;
      }

      > svg {
        width: 100%;
        height: 100%;
      }
    }
  }
`;

const Modal = ({ children, onClose, fullPage, loadingInfo = {} }) => {
  const modalRef = useRef();
  const { isLoading, message } = loadingInfo;
  useClickOutsideAlert(modalRef, onClose, []);

  return createPortal(
    <ScModal>
      <div
        className={classNames({
          modalContent: true,
          fullPage
        })}
        ref={modalRef}
      >
        <button type="button" onClick={onClose} className="modal-close">
          <CloseIcon />
        </button>
        {isLoading ? <LoadingSpinner message={message} /> : children}
      </div>
    </ScModal>,
    document.getElementById('modal-root')
  );
};

Modal.propTypes = {
  children: node.isRequired,
  onClose: func
};

Modal.defaultProps = {
  onClose: f => f
};

export default Modal;