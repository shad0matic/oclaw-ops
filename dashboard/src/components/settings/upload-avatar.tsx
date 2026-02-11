
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/crop-image'; // Helper function for cropping
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


export function UploadAvatar() {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 500 * 1024) {
        alert('File is too large. Max 500KB.');
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setIsDialogOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, fileName);
      
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, fileName);

      // Replace with your actual API endpoint for uploading
      // const response = await fetch('/api/avatars/upload', {
      //   method: 'POST',
      //   body: formData,
      // });

      // if (response.ok) {
      //   alert('Upload successful!');
      //   // TODO: Refresh the avatar library
      // } else {
      //   alert('Upload failed.');
      // }
      
      console.log('Uploading cropped image...', croppedImageBlob);
      alert('Upload successful! (mocked)');


    } catch (e) {
      console.error(e);
      alert('An error occurred while cropping the image.');
    } finally {
      setIsDialogOpen(false);
      setImageSrc(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Upload New Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground mt-2">Max file size: 500KB. Accepted formats: PNG, JPG, WEBP.</p>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Your Image</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload}>Confirm Crop & Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
