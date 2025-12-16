'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { getChainName } from '@/config/chains'

interface AllocationChartProps {
    balances: any[]
}

const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

export function AllocationChart({ balances }: AllocationChartProps) {
    // Aggregate by chain
    const chainData = balances.reduce((acc: any[], curr) => {
        const existing = acc.find(item => item.chainId === curr.chainId)
        if (existing) {
            existing.value += curr.value
        } else {
            acc.push({
                name: getChainName(curr.chainId),
                value: curr.value,
                chainId: curr.chainId
            })
        }
        return acc
    }, [])

    const data = chainData.sort((a, b) => b.value - a.value)

    if (data.length === 0) return null

    return (
        <Card className="h-[250px] w-full md:w-[350px] bg-card/50 border-border backdrop-blur-sm flex flex-col relative">
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Allocation</h3>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="55%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-popover border border-border p-2 rounded-lg shadow-xl backdrop-blur-md">
                                        <p className="font-bold text-foreground text-sm">{payload[0].name}</p>
                                        <p className="text-primary text-xs">
                                            ${(payload[0].value as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-4">
                <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">TOP</div>
                    <div className="text-lg font-bold text-foreground">
                        {data[0]?.name.substring(0, 3).toUpperCase()}
                    </div>
                </div>
            </div>
        </Card>
    )
}
