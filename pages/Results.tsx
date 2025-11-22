import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { contractService } from '../services/mockContractService';
import { useNavigate } from 'react-router-dom';

export default function Results() {
  const { matchState } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Committing Score to Blockchain...');
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const processPayout = async () => {
        // 1. Commit
        await contractService.commitScore(1001, "hash_xyz");
        setStatus("Waiting for Opponent Reveal...");
        
        // 2. Reveal
        const result = await contractService.revealScore(1001, 100, "salt_123");
        setStatus(result === 'winner' ? "YOU WON!" : "YOU LOST");
        
        // 3. Payout
        if (result === 'winner') {
            const hash = await contractService.payoutWinner(1001);
            setTxHash(hash);
        }
    };
    
    processPayout();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 text-5xl shadow-[0_0_30px_rgba(255,255,255,0.2)] ${
            status.includes('WON') ? 'bg-emerald-500' : status.includes('LOST') ? 'bg-red-500' : 'bg-slate-700 animate-pulse'
        }`}>
            {status.includes('WON') ? '🏆' : status.includes('LOST') ? '💀' : '⏳'}
        </div>

        <h2 className="text-4xl font-black mb-4">{status}</h2>
        
        <div className="glass-panel p-6 rounded-xl w-full mb-8">
            <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Stake</span>
                <span className="font-mono">{matchState.stake} CELO</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Total Pool</span>
                <span className="font-mono text-emerald-400">{parseInt(matchState.stake) * 2} CELO</span>
            </div>
            <div className="flex justify-between py-2">
                <span className="text-slate-400">Network Fee</span>
                <span className="font-mono text-slate-500">0.002 CELO</span>
            </div>
        </div>

        {txHash && (
            <div className="bg-emerald-900/30 border border-emerald-500/30 p-4 rounded-lg mb-8 text-sm break-all">
                <div className="font-bold text-emerald-400 mb-1">PAYOUT SUCCESSFUL</div>
                <div className="font-mono text-emerald-200/70">{txHash}</div>
            </div>
        )}

        <button 
            onClick={() => navigate('/select')}
            className="px-8 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-200"
        >
            PLAY AGAIN
        </button>
    </div>
  );
}
