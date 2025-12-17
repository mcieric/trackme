
import { isAddress } from 'viem'

// Copied logic from src/lib/token-list.ts
function isValidToken(token: any): boolean {
    if (!token || typeof token !== 'object') {
        // console.log('Fail object check', token);
        return false
    }

    // 1. Validate ChainID
    if (typeof token.chainId !== 'number' || token.chainId <= 0) {
        // console.log('Fail chainId', token);
        return false
    }

    // 2. Validate Address
    if (typeof token.address !== 'string' || !isAddress(token.address)) {
        // console.log('Fail address', token.address);
        return false
    }

    // 3. Validate Decimals
    if (typeof token.decimals !== 'number' || token.decimals < 0 || token.decimals > 255) {
        // console.log('Fail decimals', token);
        return false
    }

    // 4. Sanitize/Validate LogoURI if present
    if (token.logoURI) {
        if (typeof token.logoURI !== 'string') return false
        // Only allow http/https protocols to prevent XSS via javascript: or data: quirks
        if (!token.logoURI.startsWith('http://') && !token.logoURI.startsWith('https://')) {
            console.log('Fail logoURI:', token.logoURI);
            return false
        }
    }

    return true
}

const SUPERCHAIN_TOKEN_LIST_URL = 'https://ethereum-optimism.github.io/optimism.tokenlist.json'

async function main() {
    console.log('Fetching', SUPERCHAIN_TOKEN_LIST_URL);
    try {
        const response = await fetch(SUPERCHAIN_TOKEN_LIST_URL);
        const data = await response.json();
        console.log('Total tokens raw:', data.tokens.length);

        const validTokens = data.tokens.filter(isValidToken);
        console.log('Total valid tokens:', validTokens.length);

        // Group by chain
        const byChain: Record<number, number> = {};
        for (const t of validTokens) {
            byChain[t.chainId] = (byChain[t.chainId] || 0) + 1;
        }
        console.log('Counts by ChainID:', byChain);

        // Check specifically for Base (8453) and Optimism (10)
        console.log('Base (8453):', byChain[8453]);
        console.log('Optimism (10):', byChain[10]);

    } catch (e) {
        console.error(e);
    }
}

main();
