import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Cpu, Database, Zap, CheckCircle2 } from "lucide-react"

interface KPICardsProps {
    kevinStatus: {
        status: "online" | "offline"
        uptime: number
    }
    tokenUsage: {
        today: number
        cost: number
    }
    serverLoad: {
        cpu: number
        memory: number
    }
    activeRuns: number
    completedTasks: number
}

export function KPICards({ kevinStatus, tokenUsage, serverLoad, activeRuns, completedTasks }: KPICardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Kevin Status</CardTitle>
                    <Activity className={`h-4 w-4 ${kevinStatus.status === 'online' ? 'text-green-500' : 'text-red-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{kevinStatus.status === 'online' ? 'Online' : 'Offline'}</div>
                    <p className="text-xs text-zinc-500">
                        {kevinStatus.status === 'online' ? `UptimeHours: ${(kevinStatus.uptime / 3600).toFixed(1)}h` : 'System down'}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Token Usage</CardTitle>
                    <Zap className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{tokenUsage.today.toLocaleString()}</div>
                    <p className="text-xs text-zinc-500">
                        Est. cost: ${tokenUsage.cost.toFixed(2)}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Server Load</CardTitle>
                    <Cpu className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{serverLoad.cpu.toFixed(1)}%</div>
                    <p className="text-xs text-zinc-500">
                        Mem: {(serverLoad.memory / 1024 / 1024 / 1024).toFixed(1)}GB used
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Active Runs</CardTitle>
                    <Database className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{activeRuns}</div>
                    <p className="text-xs text-zinc-500">
                        Workflows running
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Tasks Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{completedTasks}</div>
                    <p className="text-xs text-zinc-500">
                        Today
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
