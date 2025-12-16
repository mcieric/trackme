'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useWalletData } from '@/hooks/useWalletData'
import { Search, Wallet, RefreshCw } from 'lucide-react'
import { AnimatedBackground } from '@/components/animated-background'
import { ChainOverview } from '@/components/chain-overview'
import { AssetTable } from '@/components/asset-table'
import { AllocationChart } from '@/components/allocation-chart'
import { cn } from '@/lib/utils'

const DEFAULT_ADDRESS = '0x88ac3d64230c8a453492ff908a02daa27e9b3429'

export function DashboardContent() {
    const [address, setAddress] = useState(DEFAULT_ADDRESS)
    const [inputAddress, setInputAddress] = useState(DEFAULT_ADDRESS)
    const [selectedChain, setSelectedChain] = useState<number | null>(null)

    const { balances, isLoading, isError } = useWalletData(address)

    // Recalculate total value client-side to ensure consistency
    const totalValue = balances.reduce((acc, curr) => acc + (curr.value || 0), 0)

    // Aggregate balances by Chain for the Overview component
    const chainBalancesMap = balances.reduce((acc, curr) => {
        if (!acc[curr.chainId]) {
            acc[curr.chainId] = {
                chainId: curr.chainId,
                value: 0,
                symbol: curr.symbol, // Default symbol, might be mixed
                // We don't really use symbol for chain card, but need shape match
            }
        }
        acc[curr.chainId].value += curr.value
        return acc
    }, {} as Record<number, any>)

    const chainBalances = Object.values(chainBalancesMap)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // Strict EVM address validation (0x + 40 hex chars)
        const evmRegex = /^0x[a-fA-F0-9]{40}$/

        if (evmRegex.test(inputAddress)) {
            setAddress(inputAddress)
            setSelectedChain(null) // Reset filter on new search
        } else {
            // Optional: Trigger error state or toast here
            console.warn("Invalid address format")
        }
    }

    return (
        <div className="min-h-screen relative font-sans selection:bg-primary/30 pb-20">
            <AnimatedBackground />

            {/* Main Layout Container */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-8 flex flex-col gap-8">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* Left: Brand & Title */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Track<span className="text-primary">Me</span> Portfolio
                            </h1>
                            <div className="text-sm text-zinc-400 font-mono opacity-80 flex items-center gap-2">
                                {address.slice(0, 6)}...{address.slice(-4)}
                                {/* Copy button could go here */}
                            </div>
                        </div>
                    </div>

                    {/* Center/Right: Net Worth & Search */}
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-6 w-full md:w-auto">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="relative group w-full md:w-[400px]">
                            <div className="absolute inset-0 bg-primary/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative flex items-center bg-zinc-900 border border-zinc-700/50 rounded-lg p-1 focus-within:border-primary/50 transition-colors">
                                <Search className="ml-3 h-4 w-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search by generic EVM address (0x...)"
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-600 px-3 py-1.5 text-sm font-medium"
                                    value={inputAddress}
                                    onChange={(e) => setInputAddress(e.target.value)}
                                />
                            </div>
                        </form>
                    </div>
                </header>

                {/* Net Worth & Chart Section */}
                <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-1 w-full md:w-auto"
                    >
                        <span className="text-zinc-400 font-medium text-sm tracking-wide uppercase">Net Worth</span>
                        <div className="flex items-center gap-4">
                            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter shadow-xl drop-shadow-[0_0_bpx_rgba(255,255,255,0.1)]">
                                {isLoading ? (
                                    <span className="animate-pulse opacity-50">$...</span>
                                ) : (
                                    `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                )}
                            </h2>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold border border-emerald-500/20 whitespace-nowrap">
                                +2.4% (24h)
                            </span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full md:w-auto flex justify-center md:justify-end"
                    >
                        <AllocationChart balances={balances} />
                    </motion.div>
                </div>

                {/* Horizontal Chain List */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Chain Allocation</h3>
                        {/* Refresh/actions */}
                        <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <ChainOverview
                        balances={chainBalances}
                        totalValue={totalValue}
                        selectedChain={selectedChain}
                        onSelectChain={setSelectedChain}
                    />
                </motion.div>

                {/* Main Table Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col gap-4"
                >
                    <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
                        <button className="text-white font-bold border-b-2 border-primary pb-4 -mb-[17px]">Portfolio</button>
                        <button className="text-zinc-500 hover:text-zinc-300 font-medium pb-4">NFTs</button>
                        <button className="text-zinc-500 hover:text-zinc-300 font-medium pb-4">History</button>
                    </div>

                    <AssetTable balances={balances} selectedChain={selectedChain} />
                </motion.div>


            </div>
        </div>
    )
}
