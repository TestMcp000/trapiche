'use client';

import { useRef, useCallback, useState } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useTranslations } from 'next-intl';
import RawImg from './RawImg';

// =============================================================================
// Types
// =============================================================================

export interface ImageCropperProps {
  imageToCrop: string;
  label?: string;
  className?: string;
  onApply: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}

// =============================================================================
// Helper function to create cropped image from canvas
// =============================================================================

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Failed to get canvas context');

  // Calculate scale ratio between displayed size and natural size
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Apply scale to crop coordinates
  const scaledCrop = {
    x: crop.x * scaleX,
    y: crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  };

  // Set canvas size to scaled crop dimensions
  canvas.width = scaledCrop.width;
  canvas.height = scaledCrop.height;

  // Draw cropped area from the original image
  ctx.drawImage(
    image,
    scaledCrop.x,
    scaledCrop.y,
    scaledCrop.width,
    scaledCrop.height,
    0,
    0,
    scaledCrop.width,
    scaledCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      0.9
    );
  });
}

// =============================================================================
// Component
// =============================================================================

export default function ImageCropper({
  imageToCrop,
  label,
  className = '',
  onApply,
  onCancel,
}: ImageCropperProps) {
  const t = useTranslations('admin.media.cropper');

  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Start with a centered crop that's 80% of the image
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        width / height, // Keep original aspect ratio initially
        width,
        height
      ),
      width,
      height
    );
    
    setCrop(initialCrop);
  }, []);

  const handleApplyCrop = async () => {
    if (!imgRef.current || !completedCrop) return;

    setUploading(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      await onApply(croppedBlob);
    } catch (err) {
      console.error('Crop error:', err);
      setError(t('errorUpload'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      {/* Crop area */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          className="max-h-[400px]"
        >
          <RawImg
            ref={imgRef}
            src={imageToCrop}
            alt="Crop"
            onLoad={onImageLoad}
            className="max-h-[400px] max-w-full"
          />
        </ReactCrop>
      </div>
      
      {/* Hint */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        💡 {t('hint')}
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleApplyCrop}
          disabled={uploading || !completedCrop}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? t('uploading') : t('apply')}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
