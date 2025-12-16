
require('dotenv').config({ path: '.env.local' });
const { Alchemy, Network } = require('alchemy-sdk');

const config = {
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    network: Network.OPT_MAINNET,
};
const alchemy = new Alchemy(config);

const main = async () => {
    // Lowercase addresses to avoid checksum errors
    const address = '0x88ac3d64230c8a453492ff908a02daa27e9b3429';
    const contracts = ['0x46777c76dbbe40fabb2aab99e33ce20058e76c59'];

    console.log('Fetching balance for address:', address);
    console.log('Contract:', contracts[0]);

    try {
        const balances = await alchemy.core.getTokenBalances(address, contracts);
        console.log(JSON.stringify(balances, null, 2));

        console.log('Fetching metadata...');
        const metadata = await alchemy.core.getTokenMetadata(contracts[0]);
        console.log(JSON.stringify(metadata, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
};

main();
