"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"

export function UploadAvatar() {
    const [preview, setPreview] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [filename, setFilename] = useState("")
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        setFile(f)
        setFilename(f.name)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result as string)
        reader.readAsDataURL(f)
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        setMessage(null)

        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("filename", filename)

            const res = await fetch("/api/avatars/upload", {
                method: "POST",
                body: formData,
            })

            if (res.ok) {
                const data = await res.json()
                setMessage(`✅ Uploaded as ${data.avatar.name}`)
                setPreview(null)
                setFile(null)
                setFilename("")
                if (inputRef.current) inputRef.current.value = ""
            } else {
                const data = await res.json()
                setMessage(`❌ ${data.error || "Upload failed"}`)
            }
        } catch (e) {
            setMessage("❌ Network error")
        } finally {
            setUploading(false)
        }
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Upload Avatar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {message && (
                        <div className="text-sm text-zinc-300 bg-zinc-800/50 rounded px-3 py-2">
                            {message}
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <Input
                            ref={inputRef}
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                            className="bg-zinc-800 border-zinc-700"
                        />
                        {preview && (
                            <Avatar className="h-14 w-14 border border-zinc-700 shrink-0">
                                <AvatarImage src={preview} />
                            </Avatar>
                        )}
                    </div>
                    {file && (
                        <div className="flex items-center gap-3">
                            <Input
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="Filename (e.g. stuart.webp)"
                                className="bg-zinc-800 border-zinc-700 max-w-xs"
                            />
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
