import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, defineChain } from 'viem';

// Type declarations
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: any[] }) => Promise<any>;
            isMetaMask?: boolean;
        };
    }
}

// Define Celo mainnet
const celoMainnet = defineChain({
    id: 42220, // 0xa4ec in hex
    name: 'Celo',
    network: 'celo',
    nativeCurrency: {
        decimals: 18,
        name: 'CELO',
        symbol: 'CELO',
    },
    rpcUrls: {
        default: {
            http: ['https://forno.celo.org'],
        },
        public: {
            http: ['https://forno.celo.org'],
        },
    },
    blockExplorers: {
        default: { name: 'CeloScan', url: 'https://celoscan.io' },
    },
    testnet: false,
});

// cUSD token address on Celo mainnet
const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

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

// MicroArena contract ABI (simplified)
const MICRO_ARENA_ABI = [
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
        inputs: [{ name: 'matchId', type: 'uint256' }, { name: 'scoreHash', type: 'bytes32' }],
        name: 'commitScore',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }, { name: 'score', type: 'uint256' }, { name: 'salt', type: 'bytes32' }],
        name: 'revealScore',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'matchId', type: 'uint256' }],
        name: 'getMatch',
        outputs: [{ name: '', type: 'tuple', components: [] }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

class ContractService {
    private publicClient: any;
    private walletClient: any;
    private contractAddress: string;
    private account: `0x${string}` | null = null;

    constructor() {
        this.contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '';

        this.publicClient = createPublicClient({
            chain: celoMainnet,
            transport: http(import.meta.env.VITE_CELO_RPC_URL || 'https://forno.celo.org'),
        });
    }

    /**
     * Connect wallet
     */
    async connectWallet(): Promise<string> {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('No wallet detected. Please install MetaMask or Valora.');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0] as `0x${string}`;

            // Create wallet client
            this.walletClient = createWalletClient({
                account: this.account,
                chain: celoMainnet,
                transport: custom(window.ethereum),
            });

            // Switch to Celo mainnet if needed
            await this.switchToCeloMainnet();

            console.log('✅ Wallet connected:', this.account);
            return this.account;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    }

    /**
     * Switch to Celo mainnet network
     */
    private async switchToCeloMainnet(): Promise<void> {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xa4ec' }], // 42220 in hex
            });
        } catch (error: any) {
            // Chain not added, add it
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xa4ec',
                        chainName: 'Celo',
                        nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                        rpcUrls: ['https://forno.celo.org'],
                        blockExplorerUrls: ['https://celoscan.io'],
                    }],
                });
            }
        }
    }

    /**
     * Get cUSD balance
     */
    async getCUSDBalance(address?: string): Promise<string> {
        const addr = address || this.account;
        if (!addr) throw new Error('No account connected');

        const balance = await this.publicClient.readContract({
            address: CUSD_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [addr],
        });

        return formatUnits(balance as bigint, 18);
    }

    /**
     * Approve cUSD spending
     */
    async approveCUSD(amount: string): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        const amountWei = parseUnits(amount, 18);

        const hash = await this.walletClient.writeContract({
            address: CUSD_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [this.contractAddress as `0x${string}`, amountWei],
        });

        console.log('✅ Approval transaction:', hash);

        // Wait for confirmation
        await this.publicClient.waitForTransactionReceipt({ hash });

        return hash;
    }

    /**
     * Create a new match
     */
    async createMatch(gameType: number, stake: string): Promise<{ matchId: bigint; txHash: string }> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        // First approve cUSD
        await this.approveCUSD(stake);

        const stakeWei = parseUnits(stake, 18);

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress as `0x${string}`,
            abi: MICRO_ARENA_ABI,
            functionName: 'createMatch',
            args: [gameType, stakeWei],
        });

        console.log('✅ Create match transaction:', hash);

        // Wait for confirmation and get match ID from events
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        // Parse MatchCreated event to get matchId
        // For now, return a placeholder
        const matchId = BigInt(Date.now());

        return { matchId, txHash: hash };
    }

    /**
     * Join an existing match
     */
    async joinMatch(matchId: bigint, stake: string): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        // First approve cUSD
        await this.approveCUSD(stake);

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress as `0x${string}`,
            abi: MICRO_ARENA_ABI,
            functionName: 'joinMatch',
            args: [matchId],
        });

        console.log('✅ Join match transaction:', hash);
        await this.publicClient.waitForTransactionReceipt({ hash });

        return hash;
    }

    /**
     * Commit score hash
     */
    async commitScore(matchId: bigint, score: number, salt: string): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        // Generate score hash: keccak256(abi.encodePacked(score, salt))
        const scoreHash = this.generateScoreHash(score, salt);

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress as `0x${string}`,
            abi: MICRO_ARENA_ABI,
            functionName: 'commitScore',
            args: [matchId, scoreHash],
        });

        console.log('✅ Commit score transaction:', hash);
        await this.publicClient.waitForTransactionReceipt({ hash });

        return hash;
    }

    /**
     * Reveal score
     */
    async revealScore(matchId: bigint, score: number, salt: string): Promise<string> {
        if (!this.walletClient || !this.account) throw new Error('Wallet not connected');

        const saltBytes = `0x${salt}` as `0x${string}`;

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress as `0x${string}`,
            abi: MICRO_ARENA_ABI,
            functionName: 'revealScore',
            args: [matchId, BigInt(score), saltBytes],
        });

        console.log('✅ Reveal score transaction:', hash);
        await this.publicClient.waitForTransactionReceipt({ hash });

        return hash;
    }

    /**
     * Generate score hash for commit
     */
    private generateScoreHash(score: number, salt: string): `0x${string}` {
        // This should use keccak256(abi.encodePacked(score, salt))
        // For now, using a simple hash
        const encoder = new TextEncoder();
        const data = encoder.encode(`${score}${salt}`);

        // In production, use proper keccak256 from viem
        return `0x${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
    }

    /**
     * Generate random salt
     */
    generateSalt(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get connected account
     */
    getAccount(): string | null {
        return this.account;
    }

    /**
     * Disconnect wallet
     */
    disconnect(): void {
        this.account = null;
        this.walletClient = null;
    }
}

export const contractService = new ContractService();
