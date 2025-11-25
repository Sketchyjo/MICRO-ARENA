import React from 'react';
import { Wallet, Connect, Avatar, Name } from "@composer-kit/ui/wallet";

interface WalletConnectionProps {
  onConnect?: () => void;
  className?: string;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ onConnect, className = '' }) => {
  return (
    <div className={`wallet-connection ${className}`}>
      <Wallet>
        <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
          <Connect
            label="Connect Wallet"
            onConnect={() => {
              console.log('Wallet connected successfully');
              onConnect?.();
            }}
          >
            <Avatar className="w-8 h-8" />
            <Name className="text-white font-medium" />
          </Connect>
        </div>
      </Wallet>
    </div>
  );
}

export default WalletConnection;