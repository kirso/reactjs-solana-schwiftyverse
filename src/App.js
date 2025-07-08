import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';
import portal from './assets/portal-green.png';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import idl from './idl.json';

import kp from './keypair.json';

// SystemProgram is a reference to the Solana runtime
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get program id from the IDL file
const programID = new PublicKey(idl.metadata.address);

// Set network to devnet
const network = clusterApiUrl('devnet');

// Acknowledgment when a transaction is done
const opts = {
  preflightCommitment: 'processed',
};

// Constants
const TWITTER_HANDLE = 'kirso';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  //Wallet state
  const [walletAddress, setWalletAddress] = useState(null);
  //Input state
  const [inputValue, setInputValue] = useState('');
  //Gifs state
  const [gifList, setGifList] = useState([]);
  // Actions
  const isConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log('PHANTON WALLET FOUND!');
          // solana object allows to connect with the user wallet
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log('Connected with Public Key:', response.publicKey.toString());

          // Set the user's publicKey in state to be used later
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('PHANTOM WALLET NOT FOUND. ADD EXTENSION? 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };
  // Method definition for wallet connection
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected wiht public key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  // Form submit
  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given!');
      return;
    }
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('GIF successfully sent to program', inputValue);

      await getGifList();
    } catch (error) {
      console.log('Error sending GIF:', error);
    }
  };

  // Handle the input and set the value of it to inputValue property.
  const onInputChange = (e) => {
    const { value } = e.target;
    setInputValue(value);
  };

  // Create an authendicated connection to solana
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment);
    return provider;
  };

  // Initialize program
  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log('ping');
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log('Created a new BaseAccount w/ address:', baseAccount.publicKey.toString());
      await getGifList();
    } catch (error) {
      console.log('Error creating BaseAccount account:', error);
    }
  };
  // Render the button if the user hasn't connected the wallet
  const renderNotConnectedContainer = () => (
    <button className='cta-button connect-wallet-button' onClick={connectWallet}>
      Connect your wallet
    </button>
  );

  // Render gifs if the wallet is connected (mapping from the above array)
  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className='connected-container'>
          <button className='cta-button submit-gif-button' onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className='connected-container'>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}>
            <input
              type='text'
              placeholder='Enter gif link!'
              value={inputValue}
              onChange={onInputChange}
            />
            <button type='submit' className='cta-button submit-gif-button'>
              Submit
            </button>
          </form>
          <div className='gif-grid'>
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className='gif-item' key={index}>
                <img src={item.gifLink} />
              </div>
            ))}
          </div>
        </div>
      );
    }
  };
  // Check if Phantom is connected when the component is mounted on every render of the page
  useEffect(() => {
    const onLoad = async () => {
      await isConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  // Getting GIFs from solana
  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log('Got the account', account);
      setGifList(account.gifList);
    } catch (error) {
      console.log('Error in getGifList: ', error);
      setGifList(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className='App'>
      {/* Styling changes */}
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className='header-container'>
          <img alt='portal' className='portal' src={portal} />
          <p className='header'>Wubba Lubba Dub Dub GIF Portal</p>
          <p className='sub-text'>View your GIF collection in the schwiftyverse ✨</p>
          {/* render "Connect to wallet" button right here */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* render gifs if wallet connected */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className='footer-container'>
          <img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
          <a
            className='footer-text'
            href={TWITTER_LINK}
            target='_blank'
            rel='noreferrer'>{`Built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
