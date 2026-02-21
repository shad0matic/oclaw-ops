"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface KanbanContextType {
    totalRunningTasks: number
    setTotalRunningTasks: (count: number) => void
    filteredRunningTasks: number
    setFilteredRunningTasks: (count: number) => void
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined)

export function KanbanProvider({ children }: { children: ReactNode }) {
    const [totalRunningTasks, setTotalRunningTasks] = useState(0)
    const [filteredRunningTasks, setFilteredRunningTasks] = useState(0)

    return (
        <KanbanContext.Provider
            value={{
                totalRunningTasks,
                setTotalRunningTasks,
                filteredRunningTasks,
                setFilteredRunningTasks,
            }}
        >
            {children}
        </KanbanContext.Provider>
    )
}

export function useKanban() {
    const context = useContext(KanbanContext)
    if (context === undefined) {
        throw new Error("useKanban must be used within a KanbanProvider")
    }
    return context
}
