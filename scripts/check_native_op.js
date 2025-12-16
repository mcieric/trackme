
const { createPublicClient, http, formatEther } = require('viem');
const { optimism } = require('viem/chains');

const main = async () => {
    const address = '0x88ac3d64230c8a453492ff908a02daa27e9b3429';

    console.log('Fetching OP Native Balance for:', address);

    const client = createPublicClient({
        chain: optimism,
        transport: http()
    });

    try {
        const balance = await client.getBalance({ address });
        console.log('Balance (Wei):', balance.toString());
        console.log('Balance (ETH):', formatEther(balance));
    } catch (error) {
        console.error('Error:', error);
    }
};

main();
