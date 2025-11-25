import React from 'react';
import { useApp } from '../App';
import { Link, useLocation } from 'react-router-dom';
import WalletConnection from './WalletConnection';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { wallet, connect, matchState } = useApp();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600 rounded-full blur-[120px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded transform group-hover:rotate-45 transition-transform duration-300"></div>
            <span className="font-brand text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              MICRO<span className="text-indigo-400">ARENA</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {matchState.stake !== '0' && location.pathname.includes('/game') && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    STAKE: {matchState.stake} CELO
                </div>
            )}
            
            <WalletConnection 
              className="wallet-header"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;