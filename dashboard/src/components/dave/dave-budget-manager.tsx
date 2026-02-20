"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PlusCircle, Edit, Target, AlertTriangle, PauseCircle, PlayCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface AgentBudget {
  agentId: string
  dailyLimit: number | null
  dailyLimitUsd: string | null
  weeklyLimit: number | null
  weeklyLimitUsd: string | null
  monthlyLimit: number | null
  monthlyLimitUsd: string | null
  alertThreshold: number
  isPaused: boolean
  currentDailySpend: number
  currentDailySpendUsd: string
  dailyPercentUsed: number | null
  hasAlerts: boolean
  isOverBudget: boolean
}

function BudgetForm({ 
  agentId, 
  budget, 
  onFinished 
}: { 
  agentId?: string
  budget?: AgentBudget | null
  onFinished: () => void 
}) {
  const { mutate } = useSWRConfig()
  const [formAgentId, setFormAgentId] = useState(agentId || budget?.agentId || "")
  const [dailyLimit, setDailyLimit] = useState(budget?.dailyLimitUsd || "")
  const [weeklyLimit, setWeeklyLimit] = useState(budget?.weeklyLimitUsd || "")
  const [monthlyLimit, setMonthlyLimit] = useState(budget?.monthlyLimitUsd || "")
  const [alertThreshold, setAlertThreshold] = useState(budget?.alertThreshold?.toString() || "80")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      agentId: formAgentId,
      dailyLimit: dailyLimit ? Math.round(parseFloat(dailyLimit) * 100) : null,
      weeklyLimit: weeklyLimit ? Math.round(parseFloat(weeklyLimit) * 100) : null,
      monthlyLimit: monthlyLimit ? Math.round(parseFloat(monthlyLimit) * 100) : null,
      alertThreshold: parseInt(alertThreshold),
    }

    await fetch('/api/dave/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    mutate('/api/dave/budgets')
    mutate('/api/dave/summary')
    onFinished()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg my-4 space-y-4 bg-background/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="agentId">Agent ID</Label>
          <Input 
            id="agentId" 
            value={formAgentId} 
            onChange={e => setFormAgentId(e.target.value)} 
            placeholder="e.g., nefario, kevin, smaug"
            required 
            disabled={!!budget}
          />
        </div>
        <div>
          <Label htmlFor="dailyLimit">Daily Limit (USD)</Label>
          <Input 
            id="dailyLimit" 
            type="number" 
            step="0.01"
            value={dailyLimit} 
            onChange={e => setDailyLimit(e.target.value)} 
            placeholder="Leave empty for no limit"
          />
        </div>
        <div>
          <Label htmlFor="weeklyLimit">Weekly Limit (USD)</Label>
          <Input 
            id="weeklyLimit" 
            type="number" 
            step="0.01"
            value={weeklyLimit} 
            onChange={e => setWeeklyLimit(e.target.value)} 
            placeholder="Leave empty for no limit"
          />
        </div>
        <div>
          <Label htmlFor="monthlyLimit">Monthly Limit (USD)</Label>
          <Input 
            id="monthlyLimit" 
            type="number" 
            step="0.01"
            value={monthlyLimit} 
            onChange={e => setMonthlyLimit(e.target.value)} 
            placeholder="Leave empty for no limit"
          />
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

export function DaveBudgetManager() {
  const { data, error, mutate } = useSWR<{ budgets: AgentBudget[] }>('/api/dave/budgets', fetcher, { refreshInterval: 10000 })
  const [isAdding, setIsAdding] = useState(false)
  const [editingBudget, setEditingBudget] = useState<AgentBudget | null>(null)

  const handlePauseResume = async (agentId: string, currentlyPaused: boolean) => {
    await fetch('/api/dave/budgets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        action: currentlyPaused ? 'resume' : 'pause',
        reason: currentlyPaused ? undefined : 'Manual pause from dashboard'
      })
    })
    mutate()
  }

  const getProgressColor = (percentUsed: number | null, isOverBudget: boolean) => {
    if (percentUsed === null) return "bg-gray-500"
    if (isOverBudget) return "bg-red-500"
    if (percentUsed >= 80) return "bg-yellow-500"
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
          <p className="text-red-400">Failed to load agent budgets</p>
        </CardContent>
      </Card>
    )
  }

  const budgets = data?.budgets || []

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Agent Budget Management
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

        {budgets.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agent budgets configured yet</p>
            <p className="text-sm mt-1">Create budgets to track and limit agent spending</p>
          </div>
        )}

        <div className="space-y-4">
          {budgets.map((budget) => {
            const hasLimit = budget.dailyLimit || budget.weeklyLimit || budget.monthlyLimit
            const percentUsed = budget.dailyPercentUsed

            return (
              <div 
                key={budget.agentId} 
                className={`p-4 rounded-lg border ${
                  budget.isPaused 
                    ? 'border-red-500/50 bg-red-500/5'
                    : budget.isOverBudget 
                      ? 'border-red-500/50 bg-red-500/5'
                      : budget.hasAlerts 
                        ? 'border-yellow-500/50 bg-yellow-500/5' 
                        : 'border-border bg-background/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-lg">{budget.agentId}</span>
                    {budget.isPaused && (
                      <Badge variant="destructive">
                        <PauseCircle className="h-3 w-3 mr-1" />
                        PAUSED
                      </Badge>
                    )}
                    {!budget.isPaused && budget.isOverBudget && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        OVER BUDGET
                      </Badge>
                    )}
                    {!budget.isPaused && !budget.isOverBudget && budget.hasAlerts && (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Warning
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={budget.isPaused ? "default" : "outline"}
                      onClick={() => handlePauseResume(budget.agentId, budget.isPaused)}
                    >
                      {budget.isPaused ? (
                        <><PlayCircle className="h-4 w-4 mr-1" /> Resume</>
                      ) : (
                        <><PauseCircle className="h-4 w-4 mr-1" /> Pause</>
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => { setEditingBudget(budget); setIsAdding(false) }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Daily Budget */}
                  {budget.dailyLimit && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily</span>
                        <span className={budget.dailyPercentUsed && budget.dailyPercentUsed >= 100 ? "text-red-400" : "text-foreground"}>
                          ${budget.currentDailySpendUsd} / ${budget.dailyLimitUsd}
                          {percentUsed !== null && ` (${percentUsed.toFixed(0)}%)`}
                        </span>
                      </div>
                      {percentUsed !== null && (
                        <Progress 
                          value={Math.min(100, percentUsed)} 
                          className={`h-2 ${getProgressColor(percentUsed, budget.isOverBudget)}`}
                        />
                      )}
                    </div>
                  )}

                  {/* Weekly Budget */}
                  {budget.weeklyLimit && (
                    <div className="text-sm text-muted-foreground">
                      <span>Weekly limit: ${budget.weeklyLimitUsd}</span>
                    </div>
                  )}

                  {/* Monthly Budget */}
                  {budget.monthlyLimit && (
                    <div className="text-sm text-muted-foreground">
                      <span>Monthly limit: ${budget.monthlyLimitUsd}</span>
                    </div>
                  )}

                  {!hasLimit && (
                    <div className="text-sm text-muted-foreground">
                      No budget limits set
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Alert threshold: {budget.alertThreshold}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
