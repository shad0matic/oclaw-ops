import { IsometricOfficeWrapper } from "@/components/dashboard/isometric-office"

export default function LabPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-100">🍌 The Lab</h1>
        <span className="text-sm text-zinc-500">Live agent visualization</span>
      </div>
      <IsometricOfficeWrapper />
    </div>
  )
}
