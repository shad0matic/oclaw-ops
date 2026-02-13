"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function SubscriptionForm({ subscription, onFinished }: { subscription?: any, onFinished: () => void }) {
    const { mutate } = useSWRConfig()
    const [name, setName] = useState(subscription?.name || "")
    const [provider, setProvider] = useState(subscription?.provider || "")
    const [monthlyPrice, setMonthlyPrice] = useState(subscription?.monthly_price || "")
    const [currency, setCurrency] = useState(subscription?.currency || "EUR")
    const [renewalDay, setRenewalDay] = useState(subscription?.renewal_day || 1)
    const [usedInOpenClaw, setUsedInOpenClaw] = useState(subscription?.used_in_openclaw || false)
    const [notes, setNotes] = useState(subscription?.notes || "")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const method = subscription ? 'PATCH' : 'POST'
        const url = subscription ? `/api/costs/subscriptions?id=${subscription.id}` : '/api/costs/subscriptions'
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                provider,
                monthly_price: parseFloat(monthlyPrice),
                currency,
                renewal_day: parseInt(renewalDay),
                used_in_openclaw: usedInOpenClaw,
                notes
            })
        })
        mutate('/api/costs/subscriptions')
        onFinished()
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg my-4 space-y-4 bg-background/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="provider">Provider</Label>
                    <Input id="provider" value={provider} onChange={e => setProvider(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="price">Monthly Price</Label>
                    <Input id="price" type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="renewal">Renewal Day</Label>
                    <Input id="renewal" type="number" min="1" max="31" value={renewalDay} onChange={e => setRenewalDay(e.target.value)} required />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="openclaw" checked={usedInOpenClaw} onCheckedChange={setUsedInOpenClaw} />
                    <Label htmlFor="openclaw">Used in OpenClaw</Label>
                </div>
            </div>
            <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onFinished}>Cancel</Button>
                <Button type="submit">{subscription ? 'Update' : 'Add'} Subscription</Button>
            </div>
        </form>
    )
}
