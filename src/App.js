import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import detectEthereumProvider from '@metamask/detect-provider';
import { Button, Table, ButtonGroup } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import WebSocket from 'isomorphic-ws';
import './App.css';

function App() {
  const [provider, setProvider] = useState(null);
  const [connected, setConnected] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [accountDaiTransactions, setAccountDaiTransactions] = useState([]);

  useEffect(() => {
    const init = async () => {
      const ethereumProvider = await detectEthereumProvider();
      if (ethereumProvider) {
        const web3Provider = new ethers.providers.Web3Provider(ethereumProvider);
        setProvider(web3Provider);
        const accounts = await web3Provider.listAccounts();
        setConnected(accounts.length > 0);
      } else {
        console.log('Please install MetaMask!');
      }
    };
    init();
  }, []);
//инициализация приложения,определяет провайдер Ethereum, проверка на наличие метамаск

  useEffect(() => {
    if (!provider) return;

    const ws = new WebSocket('wss://mainnet.infura.io/ws/v3/4cc937c8f3e747b9b21c594929616017');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: "eth_subscribe",
        params: ["logs", {
          address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        }]
      }));
    };
//установка WebSocket-соединения
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.params) {
        const log = response.params.result;
        const ethersLog = {
          blockNumber: ethers.BigNumber.from(log.blockNumber).toNumber(),
          transactionHash: log.transactionHash,
          from: ethers.utils.getAddress('0x' + log.topics[1].slice(26)),
          to: ethers.utils.getAddress('0x' + log.topics[2].slice(26)),
        };
        setTransactions((prev) => [ethersLog, ...prev]);//сохранение в предыдущего массива с добавлением новой транзакции
      }
    };
  }, [provider]);
//обработка сообщений, полученных от сервера
  useEffect(() => { 
  if (!provider) return; 
  const fetchAccountTransactions = async () => { 
    try { 
      const accounts = await provider.listAccounts(); 
      if (accounts.length === 0) { 
        setAccountTransactions([]); 
        setAccountDaiTransactions([]); 
        return; 
      } 
      accounts.forEach(async account => { 
        console.log(account) 
        const res = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${account}&startblock=0&endblock=99999999&sort=asc&apikey=W5X1VAW34IIFJRJTA2RT92GTEW57HQWS8U`); 
        if (!res.ok) { 
          throw new Error(`HTTP error! status: ${res.status}`); 
        } 
        const data = await res.json(); 
        setAccountTransactions(data.result); 
        console.log(data.result) 
        const daiTransactions = data.result.filter(tx => tx.to.toLowerCase() === "0x6B175474E89094C44Da98b954EedeAC495271d0F".toLowerCase()); 
        setAccountDaiTransactions(daiTransactions.length > 0 ? daiTransactions : [{hash: '', blockNumber: '', from: '', to: '', empty: true}]);  
      }); 
    } catch (error) { 
      console.error("An error occurred while fetching the transactions:", error); 
    } 
  }; 
  fetchAccountTransactions(); 
}, [provider]);
// получение даи транзакцией c аккаунта юзера

  const connectWallet = async () => {
    if (provider) {
      const accounts = await provider.send('eth_requestAccounts', []);
      setConnected(accounts.length > 0);
    }
  }
//подключение метамаск
  const disconnectWallet = async () => {
    setProvider(null);
    setTransactions([]);
    setAccountTransactions([]);
    setAccountDaiTransactions([]);
    setConnected(false);
  }
//обнуление информации

  return (
    <div className="App" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', color: 'white', paddingTop: '100px', padding: '150px', gap: '20px'}}>
     
      <h2>Wallet is {connected ? 'connected' : 'not connected'}.</h2>
      <ButtonGroup>
        <Button variant="warning" onClick={connectWallet} style={{ marginRight: '10px' }}>Connect Wallet</Button>
        <Button variant="warning" onClick={disconnectWallet}>Disconnect Wallet</Button>
      </ButtonGroup>
  
      <h2 style={{ textAlign: 'center', marginTop: '20px' }}>Your DAI transactions</h2>
      <div className="table-container custom-scroll" style={{ height: '200px', overflow: 'auto', color: 'white', marginBottom: '20px', borderRadius: '5px', boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)', padding: '0' }}>
        <Table hover variant="dark" className="table-hover-dark" style={{ marginBottom: '0' }}>
          <thead>
            <tr>
              <th>Block Number</th>
              <th>Transaction Hash</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {accountDaiTransactions.length > 0 ? (accountDaiTransactions.map((tx, i) => (
              tx.empty ? (
                <tr key={i}><td colSpan={4} style={{textAlign: 'center'}}>You don't have any DAI transactions yet.</td></tr> // if the transaction is a placeholder, display a message
              ) : (
                <tr key={i}>
                  <td>{tx.blockNumber}</td>
                  <td><a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer">{tx.hash}</a></td>
                  <td>{tx.from}</td>
                  <td>{tx.to}</td>
                </tr>
              )
            ))) : (
              <tr><td colSpan={4} style={{textAlign: 'center'}}>You don't have any transactions yet.</td></tr>
            )}
          </tbody>
        </Table>
      </div>
      
      <h2 style={{ textAlign: 'center', marginTop: '20px' }}>Your transactions</h2>
      <div className="table-container custom-scroll" style={{ height: '200px', overflow: 'auto', color: 'white', marginBottom: '20px', borderRadius: '5px', boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)', padding: '0' }}>
        <Table hover variant="dark" className="table-hover-dark" style={{ marginBottom: '0' }}>
          <thead>
            <tr>
              <th>Block Number</th>
              <th>Transaction Hash</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {accountTransactions.length > 0 ? (accountTransactions.map((tx, i) => (
                <tr key={i}>
                  <td>{tx.blockNumber}</td>
                  <td><a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer">{tx.hash}</a></td>
                  <td>{tx.from}</td>
                  <td>{tx.to}</td>
                </tr>
            ))) : (
              <tr><td colSpan={4} style={{textAlign: 'center'}}>You don't have any transactions yet.</td></tr>
            )}
          </tbody>
        </Table>
      </div>
      
      <h2 style={{ textAlign: 'center', marginTop: '20px' }}>All DAI transactions in the network</h2>
      <div className="table-container custom-scroll" style={{ height: '200px', overflow: 'auto', color: 'white', borderRadius: '5px', boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)', padding: '0' }}>
        <Table hover variant="dark" className="table-hover-dark" style={{ marginBottom: '0' }}>
          <thead>
            <tr>
              <th>Block Number</th>
              <th>Transaction Hash</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i}>
                <td>{tx.blockNumber}</td>
                <td><a href={`https://etherscan.io/tx/${tx.transactionHash}`} target="_blank" rel="noreferrer">{tx.transactionHash}</a></td>
                <td>{tx.from}</td>
                <td>{tx.to}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default App;
