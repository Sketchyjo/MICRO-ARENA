import { useEffect, useState } from 'react';
import { contractService } from '../services/contractService';

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      const account = contractService.getAccount();
      if (account) {
        setAddress(account);
        setIsConnected(true);
      }
    };
    
    checkConnection();
  }, []);

  const connect = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      const account = await contractService.connectWallet();
      setAddress(account);
      setIsConnected(true);
      return account;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    contractService.disconnect();
    setAddress(null);
    setIsConnected(false);
  };

  return {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };
};