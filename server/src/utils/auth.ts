import { ethers } from 'ethers';

export async function verifySignature(
    address: string,
    message: string,
    signature: string
): Promise<boolean> {
    try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
        return false;
    }
}

export function generateAuthMessage(address: string, timestamp: number): string {
    return `Welcome to Micro Arena!\n\nSign this message to authenticate your wallet.\n\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}