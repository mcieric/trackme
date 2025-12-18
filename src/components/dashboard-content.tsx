'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWalletData } from '@/hooks/useWalletData'
import { useWallets } from '@/hooks/useWallets'
import { Wallet, LayoutDashboard, Database, Settings2 } from 'lucide-react'
import { AnimatedBackground } from '@/components/animated-background'
import { ChainOverview } from '@/components/chain-overview'
import { AssetTable } from '@/components/asset-table'
import { AllocationChart } from '@/components/allocation-chart'
import { ThemeToggle } from '@/components/theme-toggle'
import { WalletManager } from '@/components/wallet-manager'
import { cn } from '@/lib/utils'

export function DashboardContent() {
    const { wallets } = useWallets()
    const walletAddresses = wallets.map(w => w.address)

    const [selectedChain, setSelectedChain] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'wallets'>('overview')

    // If no wallets, we can show a default one or an empty state
    // But for this version, we use all wallets from persistence
    const { balances, isLoading } = useWalletData(walletAddresses)

    // Recalculate total value client-side to ensure consistency
    const totalValue = balances.reduce((acc, curr) => acc + (curr.value || 0), 0)

    // Aggregate balances by Chain for the Overview component
    const chainBalancesMap = balances.reduce((acc, curr) => {
        if (!acc[curr.chainId]) {
            acc[curr.chainId] = {
                chainId: curr.chainId,
                value: 0,
                symbol: curr.symbol,
            }
        }
        acc[curr.chainId].value += curr.value
        return acc
    }, {} as Record<number, any>)

    const chainBalances = Object.values(chainBalancesMap)

    return (
        <div className="min-h-screen relative font-sans selection:bg-primary/30 pb-20 bg-background text-foreground transition-colors duration-300">
            <AnimatedBackground />

            {/* Main Layout Container */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-8 flex flex-col gap-8">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* Left: Brand & Title */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Wallet className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Track<span className="text-primary">Me</span> Portfolio
                            </h1>
                            <div className="text-sm text-muted-foreground font-mono opacity-80 flex items-center gap-2">
                                {wallets.length} wallet{wallets.length > 1 ? 's' : ''} tracked
                            </div>
                        </div>
                    </div>

                    {/* Right: Controls & Tabs */}
                    <div className="flex items-center gap-4">
                        <nav className="flex items-center bg-card border border-border p-1 rounded-xl shadow-sm">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                                    activeTab === 'overview' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('wallets')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                                    activeTab === 'wallets' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Database className="w-4 h-4" />
                                Wallets
                            </button>
                        </nav>
                        <ThemeToggle />
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' ? (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-8"
                        >
                            {/* Net Worth & Chart Section */}
                            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                                <div className="flex flex-col gap-1 w-full md:w-auto">
                                    <span className="text-muted-foreground font-medium text-sm tracking-wide uppercase">Total Net Worth</span>
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-tighter shadow-xl drop-shadow-[0_0_bpx_rgba(255,255,255,0.1)]">
                                            {isLoading ? (
                                                <span className="animate-pulse opacity-50">$...</span>
                                            ) : (
                                                `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            )}
                                        </h2>
                                        {!isLoading && (
                                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-sm font-bold border border-emerald-500/20 whitespace-nowrap">
                                                Active Aggregation
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full md:w-auto flex justify-center md:justify-end">
                                    <AllocationChart balances={balances} />
                                </div>
                            </div>

                            {/* Horizontal Chain List */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-foreground">Chain Allocation</h3>
                                </div>
                                <ChainOverview
                                    balances={chainBalances}
                                    totalValue={totalValue}
                                    selectedChain={selectedChain}
                                    onSelectChain={setSelectedChain}
                                />
                            </div>

                            {/* Main Table Content */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 border-b border-border pb-4">
                                    <button className="text-foreground font-bold border-b-2 border-primary pb-4 -mb-[17px]">Full Portfolio</button>
                                    <button className="text-muted-foreground hover:text-foreground font-medium pb-4 transition-colors">By Wallet</button>
                                </div>

                                <AssetTable balances={balances} selectedChain={selectedChain} />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="wallets"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-2xl mx-auto w-full"
                        >
                            <WalletManager />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
