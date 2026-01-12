'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import RawImg from './RawImg';
import type { UploadSignatureResponse, UploadSignatureErrorResponse } from '@/lib/types/content';

// =============================================================================
// Types
// =============================================================================

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onUploadComplete?: (result: { url: string; width: number; height: number }) => void;
  locale: string;
  className?: string;
  label?: string;
}

// =============================================================================
// Dynamic Import for Image Cropper (loads react-image-crop only when needed)
// =============================================================================

const ImageCropper = dynamic(() => import('./ImageCropper'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
        <div className="animate-pulse text-gray-400">Loading cropper...</div>
      </div>
    </div>
  ),
});

// =============================================================================
// Component
// =============================================================================

export default function ImageUploader({ 
  value, 
  onChange, 
  onUploadComplete,
  locale, 
  className = '',
  label
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cropper state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const labels = {
    en: {
      dropzone: 'Drag and drop an image, or click to select',
      uploading: 'Uploading...',
      change: 'Change',
      remove: 'Remove',
      urlPlaceholder: 'Or paste image URL',
      errorUpload: 'Upload failed. Please try again.',
      errorType: 'Invalid file type. Use JPEG, PNG, GIF, WebP.',
      errorSize: 'File too large. Maximum 100MB.',
    },
    zh: {
      dropzone: '拖放圖片至此，或點擊選擇檔案',
      uploading: '上傳中...',
      change: '更換',
      remove: '移除',
      urlPlaceholder: '或貼上圖片網址',
      errorUpload: '上傳失敗，請重試。',
      errorType: '不支援的檔案格式。請使用 JPEG、PNG、GIF、WebP。',
      errorSize: '檔案過大，最大 100MB。',
    },
  };

  const t = labels[locale as keyof typeof labels] || labels.en;

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(`${t.errorType} (${file.type})`);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError(t.errorSize);
      return;
    }

    setError(null);
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
  };

  const uploadToCloudinary = async (blob: Blob) => {
    setUploading(true);
    setError(null);

    try {
      const signatureResponse = await fetch('/api/upload-signature', {
        method: 'POST',
      });

      if (!signatureResponse.ok) {
        const data: UploadSignatureErrorResponse = await signatureResponse.json();
        throw new Error(data.error || 'Failed to get upload signature');
      }

      const { signature, timestamp, cloudName, folder }: UploadSignatureResponse = await signatureResponse.json();
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey || '');
      formData.append('folder', folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error?.message || 'Upload to Cloudinary failed');
      }

      const result = await uploadResponse.json();

      const secureUrl = typeof result?.secure_url === 'string' ? result.secure_url : '';
      const width = typeof result?.width === 'number' ? result.width : 0;
      const height = typeof result?.height === 'number' ? result.height : 0;

      if (onUploadComplete && secureUrl && width > 0 && height > 0) {
        onUploadComplete({ url: secureUrl, width, height });
      } else {
        onChange(secureUrl);
      }
      setImageToCrop(null);
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : t.errorUpload;
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelCrop = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setError(null);
  };

  // Crop Modal (dynamically loaded)
  if (imageToCrop) {
    return (
      <ImageCropper
        imageToCrop={imageToCrop}
        locale={locale}
        label={label}
        className={className}
        onApply={uploadToCloudinary}
        onCancel={handleCancelCrop}
      />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      {/* Preview or Dropzone */}
      {value ? (
        <div className="relative group">
          <RawImg
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {t.change}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              {t.remove}
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            w-full h-48 border-2 border-dashed rounded-lg cursor-pointer
            flex flex-col items-center justify-center gap-2 transition-colors
            ${dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }
          `}
        >
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
            {t.dropzone}
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {/* URL Input fallback */}
      <input
        type="url"
        value={value}
        onChange={handleUrlChange}
        placeholder={t.urlPlaceholder}
        className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Loading indicator */}
      {uploading && (
        <p className="text-sm text-blue-500">{t.uploading}</p>
      )}
    </div>
  );
}
