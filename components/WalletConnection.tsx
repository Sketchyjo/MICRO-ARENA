import React from 'react';
import { Wallet, Connect, Avatar, Name } from '@composer-kit/ui/wallet';
import { Balance } from '@composer-kit/ui/balance';
import { Address } from '@composer-kit/ui/address';

interface WalletConnectionProps {
  onConnect?: () => void;
  className?: string;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ onConnect, className = '' }) => {
  return (
    <div className={`wallet-connection ${className}`}>
      <Wallet>
        <Connect
          label="Connect Wallet"
          onConnect={() => {
            console.log('Wallet connected successfully');
            onConnect?.();
          }}
        >
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
            <Avatar className="w-8 h-8" />
            <div className="flex flex-col">
              <Name className="text-white font-medium" />
              <Address 
                className="text-gray-400 text-sm" 
                copyOnClick={true}
              />
            </div>
            <div className="ml-auto">
              <Balance 
                token="cUSD"
                className="text-green-400 font-mono text-sm"
              />
            </div>
          </div>
        </Connect>
      </Wallet>
    </div>
  );
};

export default WalletConnection;