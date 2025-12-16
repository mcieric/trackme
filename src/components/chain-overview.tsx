'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { CHAIN_ICONS, getChainName } from '@/config/chains'
import { cn } from '@/lib/utils'

interface ChainOverviewProps {
    balances: any[]
    totalValue: number
    selectedChain: number | null
    onSelectChain: (chainId: number | null) => void
}

export function ChainOverview({ balances, totalValue, selectedChain, onSelectChain }: ChainOverviewProps) {
    // Sort by value desc
    const sortedBalances = [...balances].sort((a, b) => b.value - a.value)

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
                {/* All Chains Summary Item */}
                <Card
                    onClick={() => onSelectChain(null)}
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 min-w-[160px] cursor-pointer transition-all border",
                        selectedChain === null
                            ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                            : "bg-card border-border hover:bg-secondary"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors",
                        selectedChain === null ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
                    )}>
                        ALL
                    </div>
                    <div>
                        <div className={cn("text-sm font-medium", selectedChain === null ? "text-primary" : "text-muted-foreground")}>All Chains</div>
                        <div className="text-sm font-bold text-foreground">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </Card>

                {sortedBalances.map((balance) => {
                    const percent = totalValue > 0 ? (balance.value / totalValue) * 100 : 0
                    const isSelected = selectedChain === balance.chainId

                    return (
                        <Card
                            key={balance.chainId}
                            onClick={() => onSelectChain(balance.chainId)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 min-w-[180px] cursor-pointer transition-all border",
                                isSelected
                                    ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                                    : "bg-card border-border hover:bg-secondary"
                            )}
                        >
                            <div className="relative">
                                {CHAIN_ICONS[balance.chainId] ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={CHAIN_ICONS[balance.chainId]}
                                        alt={balance.symbol}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-foreground">
                                        {balance.chainId}
                                    </div>
                                )}
                                {/* Chain Logo Overlay if needed */}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
                                        <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
                                            {getChainName(balance.chainId)}
                                        </span>
                                    </span>
                                    <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                </div>
                                <div className="text-sm font-bold text-foreground">
                                    ${balance.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
