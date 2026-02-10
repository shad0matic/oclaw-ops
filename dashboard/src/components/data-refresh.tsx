"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function DataRefresh({ interval = 30000 }: { interval?: number }) {
    const router = useRouter()

    useEffect(() => {
        const timer = setInterval(() => {
            router.refresh()
        }, interval)

        return () => clearInterval(timer)
    }, [router, interval])

    return null
}
