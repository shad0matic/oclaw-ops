// @ts-nocheck

"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Cropper from "react-easy-crop"
import { getCroppedImg } from "@/lib/crop-image"

export function UploadAvatar() {
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader()
            reader.addEventListener("load", () => setImageSrc(reader.result as string))
            reader.readAsDataURL(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) {
            return
        }

        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
            // Call API to upload cropped image
            console.log("Uploading cropped image:", croppedImage)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-zinc-400">Upload Avatar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Input type="file" onChange={handleFileChange} accept="image/*" />
                    {imageSrc && (
                        <div className="relative h-64 w-full">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                    )}
                    <Button onClick={handleUpload} disabled={!imageSrc}>
                        Upload and Crop
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
