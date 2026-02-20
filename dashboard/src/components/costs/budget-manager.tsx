"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PlusCircle, Edit, Trash2, AlertTriangle, Target, TrendingUp } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Budget {
    id: number
    name: string
    amount_usd: number
    period_type: string
    alert_threshold_percent: number
    category: string
    is_active: boolean
    current_spend_usd: number
    percent_used: number
    alert_triggered: boolean
    remaining_usd: number
}

function BudgetForm({ 
    budget, 
    onFinished 
}: { 
    budget?: Budget | null
    onFinished: () => void 
}) {
    const { mutate } = useSWRConfig()
    const [name, setName] = useState(budget?.name || "")
    const [amountUsd, setAmountUsd] = useState(budget?.amount_usd?.toString() || "")
    const [periodType, setPeriodType] = useState(budget?.period_type || "monthly")
    const [alertThreshold, setAlertThreshold] = useState(budget?.alert_threshold_percent?.toString() || "80")
    const [category, setCategory] = useState(budget?.category || "total")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const method = budget ? 'PATCH' : 'POST'
        const url = budget ? `/api/costs/budgets?id=${budget.id}` : '/api/costs/budgets'
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                amount_usd: parseFloat(amountUsd),
                period_type: periodType,
                alert_threshold_percent: parseInt(alertThreshold),
                category,
            })
        })
        mutate('/api/costs/budgets')
        onFinished()
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg my-4 space-y-4 bg-background/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Budget Name</Label>
                    <Input 
                        id="name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="e.g., Monthly AI Spend"
                        required 
                    />
                </div>
                <div>
                    <Label htmlFor="amount">Budget Amount (USD)</Label>
                    <Input 
                        id="amount" 
                        type="number" 
                        step="0.01"
                        value={amountUsd} 
                        onChange={e => setAmountUsd(e.target.value)} 
                        placeholder="100.00"
                        required 
                    />
                </div>
                <div>
                    <Label htmlFor="period">Period</Label>
                    <Select value={periodType} onValueChange={setPeriodType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="total">Total (AI + Subscriptions)</SelectItem>
                            <SelectItem value="ai">AI Only</SelectItem>
                            <SelectItem value="subscriptions">Subscriptions Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="threshold">Alert Threshold (%)</Label>
                    <Input 
                        id="threshold" 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={alertThreshold} 
                        onChange={e => setAlertThreshold(e.target.value)} 
                        required 
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onFinished}>Cancel</Button>
                <Button type="submit">{budget ? 'Update' : 'Create'} Budget</Button>
            </div>
        </form>
    )
}

export function BudgetManager() {
    const { data: budgets, error, mutate } = useSWR<Budget[]>('/api/costs/budgets', fetcher, { refreshInterval: 30000 })
    const [isAdding, setIsAdding] = useState(false)
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this budget?')) return
        await fetch(`/api/costs/budgets?id=${id}`, { method: 'DELETE' })
        mutate()
    }

    const getProgressColor = (percentUsed: number, alertThreshold: number) => {
        if (percentUsed >= 100) return "bg-red-500"
        if (percentUsed >= alertThreshold) return "bg-yellow-500"
        return "bg-green-500"
    }

    const onFormFinished = () => {
        setIsAdding(false)
        setEditingBudget(null)
    }

    if (error) {
        return (
            <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                    <p className="text-red-400">Failed to load budgets</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Budget Management
                </CardTitle>
                <Button size="sm" onClick={() => { setIsAdding(true); setEditingBudget(null) }}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Budget
                </Button>
            </CardHeader>
            <CardContent>
                {(isAdding || editingBudget) && (
                    <BudgetForm budget={editingBudget} onFinished={onFormFinished} />
                )}

                {(!budgets || budgets.length === 0) && !isAdding && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No budgets configured yet</p>
                        <p className="text-sm mt-1">Create a budget to track your spending limits</p>
                    </div>
                )}

                <div className="space-y-4">
                    {budgets?.map((budget) => (
                        <div 
                            key={budget.id} 
                            className={`p-4 rounded-lg border ${budget.alert_triggered ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-background/50'}`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{budget.name}</span>
                                    {budget.alert_triggered && (
                                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            Alert
                                        </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                        {budget.period_type}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {budget.category === 'total' ? 'All' : budget.category}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => { setEditingBudget(budget); setIsAdding(false) }}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => handleDelete(budget.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        ${(Number(budget.current_spend_usd) || 0).toFixed(2)} / ${(Number(budget.amount_usd) || 0).toFixed(2)}
                                    </span>
                                    <span className={budget.alert_triggered ? "text-yellow-500" : "text-muted-foreground"}>
                                        {(Number(budget.percent_used) || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <Progress 
                                    value={Math.min(100, budget.percent_used)} 
                                    className={`h-2 ${getProgressColor(budget.percent_used, budget.alert_threshold_percent)}`}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Remaining: ${(Number(budget.remaining_usd) || 0).toFixed(2)}
                                    </span>
                                    <span>Alert at {budget.alert_threshold_percent}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
