import {
    createPublicClient,
    createWalletClient,
    custom,
    http,
    parseUnits,
    formatUnits,
    defineChain,
    keccak256,
    encodePacked,
    parseAbiItem,
    decodeEventLog
} from 'viem';
import { celoSepolia } from 'viem/chains';

// Type declarations
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: any[] }) => Promise<any>;
            isMetaMask?: boolean;
            on?: (event: string, callback: (...args: any[]) => void) => void;
            removeListener?: (event: string, callback: (...args: any[]) => void) => void;
        };
    }
}

// Define Celo Sepolia testnet
// Celo Sepolia is imported from viem/chains
const celoSepoliaChain = celoSepolia;

// cUSD token address on Celo Sepolia testnet
const CUSD_ADDRESS = '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b';

// ERC20 ABI (minimal for our needs)
const ERC20_ABI = [
    {
        inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Complete MicroArena contract ABI
const MICRO_ARENA_ABI = [
    // Functions
    {
        inputs: [{ name: 'gameType', type: 'uint8' }, { name: 'stake', type: 'uint256' }],
        name: 'createMatch',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }],
        name: 'joinMatch',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }],
        name: 'cancelMatch',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }, { name: 'scoreHash', type: 'bytes32' }],
        name: 'commitScore',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'matchId', type: 'uint256' },
            { name: 'score', type: 'uint256' },
            { name: 'salt', type: 'bytes32' },
            { name: 'commitBlock', type: 'uint256' }
        ],
        name: 'revealScore',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }],
        name: 'claimTimeout',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }],
        name: 'getMatch',
        outputs: [{
            name: '',
            type: 'tuple',
            components: [
                { name: 'id', type: 'uint256' },
                { name: 'gameType', type: 'uint8' },
                { name: 'player1', type: 'address' },
                { name: 'player2', type: 'address' },
                { name: 'stake', type: 'uint256' },
                { name: 'status', type: 'uint8' },
                { name: 'p1CommitHash', type: 'bytes32' },
                { name: 'p2CommitHash', type: 'bytes32' },
                { name: 'p1Score', type: 'uint256' },
                { name: 'p2Score', type: 'uint256' },
                { name: 'winner', type: 'address' },
                { name: 'createdAt', type: 'uint256' },
                { name: 'commitDeadline', type: 'uint256' },
                { name: 'revealDeadline', type: 'uint256' },
            ]
        }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'player', type: 'address' }],
        name: 'getPlayerMatches',
        outputs: [{ name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'player', type: 'address' }],
        name: 'getPlayerStats',
        outputs: [{ name: 'wins', type: 'uint256' }, { name: 'losses', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { name: 'gameType', type: 'uint8' },
            { name: 'minStake', type: 'uint256' },
            { name: 'maxStake', type: 'uint256' }
        ],
        name: 'getAvailableMatches',
        outputs: [{ name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'matchId', type: 'uint256' },
            { indexed: true, name: 'player1', type: 'address' },
            { indexed: false, name: 'gameType', type: 'uint8' },
            { indexed: false, name: 'stake', type: 'uint256' }
        ],
        name: 'MatchCreated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'matchId', type: 'uint256' },
            { indexed: true, name: 'player2', type: 'address' }
        ],
        name: 'MatchJoined',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'matchId', type: 'uint256' },
            { indexed: true, name: 'player', type: 'address' },
            { indexed: false, name: 'commitHash', type: 'bytes32' }
        ],
        name: 'ScoreCommitted',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'matchId', type: 'uint256' },
            { indexed: true, name: 'player', type: 'address' },
            { indexed: false, name: 'score', type: 'uint256' }
        ],
        name: 'ScoreRevealed',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'matchId', type: 'uint256' },
            { indexed: true, name: 'winner', type: 'address' },
            { indexed: false, name: 'payout', type: 'uint256' }
        ],
        name: 'MatchCompleted',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'matchId', type: 'uint256' },
            { indexed: true, name: 'canceller', type: 'address' }
        ],
        name: 'MatchCancelled',
        type: 'event',
    },
] as const;

export interface Match {
    id: bigint;
    gameType: number;
    player1: string;
    player2: string;
    stake: bigint;
    status: number;
    p1CommitHash: string;
    p2CommitHash: string;
    p1Score: bigint;
    p2Score: bigint;
    winner: string;
    createdAt: bigint;
    commitDeadline: bigint;
    revealDeadline: bigint;
}

export interface PlayerStats {
    wins: bigint;
    losses: bigint;
}

type EventCallback = (data: any) => void;

class ContractService {
    private publicClient: any;
    private walletClient: any = null;
    private contractAddress: string;
    private account: `0x${string}` | null = null;
    private eventListeners: Map<string, EventCallback[]> = new Map();
    private unwatch: (() => void) | null = null;

    constructor() {
        this.contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0xeDA72a2C5Bfb7c6f88F27768FCeF697C20954E31';

        this.publicClient = createPublicClient({
            chain: celoSepolia,
            transport: http(import.meta.env.VITE_CELO_RPC_URL || 'https://celo-sepolia.g.alchemy.com/v2/zSVVVZsFAtdutTtjLmf12'),
        });
    }

    /**
     * Connect wallet
     */
    async connectWallet(): Promise<string> {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('No wallet detected. Please install MetaMask or a compatible wallet.');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0] as `0x${string}`;
            console.log('✅ Wallet connected:', this.account);

            // Create wallet client
            this.walletClient = createWalletClient({
                account: this.account,
                chain: celoSepolia,
                transport: custom(window.ethereum),
            });

            // Switch to Celo Sepolia if needed
            await this.switchToCeloSepolia();

            // Start listening for events
            this.startEventListening();

            console.log('✅ Wallet connected:', this.account);
            return this.account;
        } catch (error: any) {
            console.error('Failed to connect wallet:', error);
            throw new Error(`Wallet connection failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Switch to Celo Sepolia testnet
     */
    private async switchToCeloSepolia(): Promise<void> {
        try {
            await window.ethereum!.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa07cc' }], // 11142220 in hex
            });
        } catch (error: any) {
            // Chain not added, add it
            if (error.code === 4902) {
                await window.ethereum!.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa07cc',
                        chainName: 'Celo Sepolia Testnet',
                        nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                        rpcUrls: ['https://celo-sepolia.g.alchemy.com/v2/zSVVVZsFAtdutTtjLmf12'],
                        blockExplorerUrls: ['https://celo-sepolia.celoscan.io'],
                    }],
                });
            } else {
                throw error;
            }
        }
    }

    /**
     * Start listening for contract events
     */
    private startEventListening(): void {
        if (this.unwatch) return; // Already listening

        this.unwatch = this.publicClient.watchContractEvent({
            address: this.contractAddress as `0x${string}`,
            abi: MICRO_ARENA_ABI,
            onLogs: (logs: any[]) => {
                logs.forEach(log => {
                    const eventName = log.eventName;
                    const listeners = this.eventListeners.get(eventName) || [];
                    listeners.forEach(callback => callback(log.args));
                });
            },
        });
    }

    /**
     * Subscribe to contract events
     */
    on(eventName: string, callback: EventCallback): void {
        const listeners = this.eventListeners.get(eventName) || [];
        listeners.push(callback);
        this.eventListeners.set(eventName, listeners);
    }

    /**
     * Unsubscribe from contract events
     */
    off(eventName: string, callback?: EventCallback): void {
        if (!callback) {
            this.eventListeners.delete(eventName);
            return;
        }

        const listeners = this.eventListeners.get(eventName) || [];
        const filtered = listeners.filter(cb => cb !== callback);
        this.eventListeners.set(eventName, filtered);
    }

    /**
     * Get current account address from walletClient, this.account, or window.ethereum
     */
    private async getAccountAddress(providedAddress?: string): Promise<string | null> {
        if (providedAddress) return providedAddress;

        // Primary source: this.account (set by both connectWallet and setAccount)
        if (this.account) return this.account;

        // Fallback 1: Try to get from walletClient.account
        if (this.walletClient?.account) {
            const address = typeof this.walletClient.account === 'string'
                ? this.walletClient.account
                : this.walletClient.account.address;

            // Cache it in this.account for future use
            if (address) {
                this.account = address as `0x${string}`;
            }
            return address;
        }

        // Fallback 2: Direct window.ethereum check (matches App.tsx logic)
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    const address = accounts[0] as `0x${string}`;
                    this.account = address;
                    console.log("✅ Auto-detected wallet connection:", this.account);

                    // Initialize wallet client if needed
                    if (!this.walletClient) {
                        this.walletClient = createWalletClient({
                            account: this.account,
                            chain: celoSepolia,
                            transport: custom(window.ethereum),
                        });
                    }
                    return address;
                }
            } catch (error) {
                console.warn('Failed to check existing wallet connection:', error);
            }
        }

        return null;
    }

    /**
     * Get cUSD balance
     */
    async getCUSDBalance(address?: string): Promise<string> {
        const addr = await this.getAccountAddress(address);
        console.log("Getting cUSD balance for address:", addr);
        console.log("this.account:", this.account);
        console.log("this.walletClient:", this.walletClient ? "exists" : "null");

        if (!addr) {
            throw new Error('No account connected. Please connect your wallet first.');
        }

        try {
            const balance = await this.publicClient.readContract({
                address: CUSD_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [addr as `0x${string}`],
            });

            const formattedBalance = formatUnits(balance as bigint, 18);
            console.log("cUSD balance:", formattedBalance);
            return formattedBalance;
        } catch (error: any) {
            console.error('Failed to get cUSD balance:', error);
            throw new Error(`Failed to get balance: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get cUSD allowance
     */
    async getCUSDAllowance(address?: string): Promise<string> {
        const addr = await this.getAccountAddress(address);
        if (!addr) throw new Error('No account connected');

        try {
            const allowance = await this.publicClient.readContract({
                address: CUSD_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [addr, this.contractAddress as `0x${string}`],
            });

            return formatUnits(allowance as bigint, 18);
        } catch (error: any) {
            console.error('Failed to get cUSD allowance:', error);
            throw new Error(`Failed to get allowance: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Approve cUSD spending
     */
    async approveCUSD(amount: string): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            const amountWei = parseUnits(amount, 18);

            const hash = await this.walletClient.writeContract({
                address: CUSD_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [this.contractAddress as `0x${string}`, amountWei],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Approval transaction:', hash);

            // Wait for confirmation
            await this.publicClient.waitForTransactionReceipt({ hash });

            return hash;
        } catch (error: any) {
            console.error('Failed to approve cUSD:', error);
            throw new Error(`Approval failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Create a new match
     */
    async createMatch(gameType: number, stake: string): Promise<{ matchId: bigint; txHash: string }> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            // First approve cUSD
            await this.approveCUSD(stake);

            const stakeWei = parseUnits(stake, 18);

            const hash = await this.walletClient.writeContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'createMatch',
                args: [gameType, stakeWei],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Create match transaction:', hash);

            // Wait for confirmation and get match ID from events
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

            // Parse MatchCreated event to get matchId
            let matchId = BigInt(0);
            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: MICRO_ARENA_ABI,
                        data: log.data,
                        topics: log.topics,
                    }) as { eventName: string; args: any };

                    if (decoded.eventName === 'MatchCreated') {
                        matchId = (decoded.args as any).matchId;
                        break;
                    }
                } catch (e) {
                    // Skip logs that don't match our ABI
                    continue;
                }
            }

            if (matchId === BigInt(0)) {
                throw new Error('Failed to extract match ID from transaction');
            }

            return { matchId, txHash: hash };
        } catch (error: any) {
            console.error('Failed to create match:', error);
            throw new Error(`Match creation failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Join an existing match
     */
    async joinMatch(matchId: bigint, stake: string): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            // First approve cUSD
            await this.approveCUSD(stake);

            const hash = await this.walletClient.writeContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'joinMatch',
                args: [matchId],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Join match transaction:', hash);
            await this.publicClient.waitForTransactionReceipt({ hash });

            return hash;
        } catch (error: any) {
            console.error('Failed to join match:', error);
            throw new Error(`Join match failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Cancel a match
     */
    async cancelMatch(matchId: bigint): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            const hash = await this.walletClient.writeContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'cancelMatch',
                args: [matchId],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Cancel match transaction:', hash);
            await this.publicClient.waitForTransactionReceipt({ hash });

            return hash;
        } catch (error: any) {
            console.error('Failed to cancel match:', error);
            throw new Error(`Cancel match failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Commit score hash
     */
    async commitScore(matchId: bigint, score: number, salt: string): Promise<{ txHash: string; commitBlock: bigint }> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            // Get current block number
            const blockNumber = await this.publicClient.getBlockNumber();

            // Generate score hash: keccak256(abi.encodePacked(score, salt, msg.sender, blockNumber))
            const scoreHash = this.generateScoreHash(score, salt, this.account, blockNumber);

            const hash = await this.walletClient.writeContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'commitScore',
                args: [matchId, scoreHash],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Commit score transaction:', hash);
            await this.publicClient.waitForTransactionReceipt({ hash });

            return { txHash: hash, commitBlock: blockNumber };
        } catch (error: any) {
            console.error('Failed to commit score:', error);
            throw new Error(`Commit score failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Reveal score
     */
    async revealScore(matchId: bigint, score: number, salt: string, commitBlock: bigint): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            const saltBytes = `0x${salt.padStart(64, '0')}` as `0x${string}`;

            const hash = await this.walletClient.writeContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'revealScore',
                args: [matchId, BigInt(score), saltBytes, commitBlock],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Reveal score transaction:', hash);
            await this.publicClient.waitForTransactionReceipt({ hash });

            return hash;
        } catch (error: any) {
            console.error('Failed to reveal score:', error);
            throw new Error(`Reveal score failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Claim timeout win
     */
    async claimTimeout(matchId: bigint): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        try {
            const hash = await this.walletClient.writeContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'claimTimeout',
                args: [matchId],
                chain: celoSepolia,
                account: this.account,
            });

            console.log('✅ Claim timeout transaction:', hash);
            await this.publicClient.waitForTransactionReceipt({ hash });

            return hash;
        } catch (error: any) {
            console.error('Failed to claim timeout:', error);
            throw new Error(`Claim timeout failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get match details
     */
    async getMatch(matchId: bigint): Promise<Match> {
        try {
            const match = await this.publicClient.readContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'getMatch',
                args: [matchId],
            });

            return match as Match;
        } catch (error: any) {
            console.error('Failed to get match:', error);
            throw new Error(`Get match failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get player matches
     */
    async getPlayerMatches(address?: string): Promise<bigint[]> {
        const addr = await this.getAccountAddress(address);
        if (!addr) throw new Error('No account connected');

        try {
            const matches = await this.publicClient.readContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'getPlayerMatches',
                args: [addr],
            });

            return matches as bigint[];
        } catch (error: any) {
            console.error('Failed to get player matches:', error);
            throw new Error(`Get player matches failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get player stats
     */
    async getPlayerStats(address?: string): Promise<PlayerStats> {
        const addr = await this.getAccountAddress(address);
        if (!addr) throw new Error('No account connected');

        try {
            const stats = await this.publicClient.readContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'getPlayerStats',
                args: [addr],
            });

            const [wins, losses] = stats as [bigint, bigint];
            return { wins, losses };
        } catch (error: any) {
            console.error('Failed to get player stats:', error);
            throw new Error(`Get player stats failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get available matches
     */
    async getAvailableMatches(gameType: number, minStake: string = '0', maxStake: string = '1000000'): Promise<bigint[]> {
        try {
            const minStakeWei = parseUnits(minStake, 18);
            const maxStakeWei = parseUnits(maxStake, 18);

            const matches = await this.publicClient.readContract({
                address: this.contractAddress as `0x${string}`,
                abi: MICRO_ARENA_ABI,
                functionName: 'getAvailableMatches',
                args: [gameType, minStakeWei, maxStakeWei],
            });

            return matches as bigint[];
        } catch (error: any) {
            console.error('Failed to get available matches:', error);
            throw new Error(`Get available matches failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Generate score hash for commit (proper keccak256)
     */
    private generateScoreHash(score: number, salt: string, sender: string, blockNumber: bigint): `0x${string}` {
        // Ensure salt is 32 bytes (64 hex chars)
        const saltBytes = `0x${salt.padStart(64, '0')}` as `0x${string}`;

        // keccak256(abi.encodePacked(score, salt, sender, blockNumber))
        return keccak256(
            encodePacked(
                ['uint256', 'bytes32', 'address', 'uint256'],
                [BigInt(score), saltBytes, sender as `0x${string}`, blockNumber]
            )
        );
    }

    /**
     * Generate random salt (32 bytes)
     */
    generateSalt(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Set account from external wallet (e.g., Celo Composer Kit)
     */
    setAccount(address: string): void {
        this.account = address as `0x${string}`;
        if (typeof window.ethereum !== 'undefined') {
            this.walletClient = createWalletClient({
                account: this.account,
                chain: celoSepolia,
                transport: custom(window.ethereum),
            });
            this.startEventListening();
        }
    }

    /**
     * Get connected account
     */
    getAccount(): string | null {
        return this.account;
    }

    /**
     * Check if wallet is connected
     */
    isConnected(): boolean {
        return this.account !== null;
    }

    /**
     * Disconnect wallet
     */
    disconnect(): void {
        this.account = null;
        this.walletClient = null;

        // Stop event listening
        if (this.unwatch) {
            this.unwatch();
            this.unwatch = null;
        }

        this.eventListeners.clear();
    }

    /**
     * Get block explorer URL for transaction
     */
    getExplorerUrl(txHash: string): string {
        return `https://celo-sepolia.celoscan.io/tx/${txHash}`;
    }

    /**
     * Get block explorer URL for address
     */
    getAddressExplorerUrl(address: string): string {
        return `https://celo-sepolia.celoscan.io/address/${address}`;
    }
}

export const contractService = new ContractService();
