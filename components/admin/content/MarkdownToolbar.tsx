'use client';

import { useState, useRef } from 'react';
import RawImg from '../common/RawImg';
import type { UploadSignatureResponse, UploadSignatureErrorResponse } from '@/lib/types/content';

type ToolbarAction = {
  label: string;
  icon: React.ReactNode;
  action: (insert: (before: string, after?: string) => void) => void;
  isSpecial?: boolean;
};

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string) => void;
  className?: string;
}

export default function MarkdownToolbar({ onInsert, className = '' }: MarkdownToolbarProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError(`Invalid file type: ${file.type}`);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File too large (max 100MB)');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Step 1: Get signature from our API
      const signatureResponse = await fetch('/api/upload-signature', {
        method: 'POST',
      });

      if (!signatureResponse.ok) {
        const data: UploadSignatureErrorResponse = await signatureResponse.json();
        throw new Error(data.error || 'Failed to get upload signature');
      }

      const { signature, timestamp, cloudName, folder }: UploadSignatureResponse = await signatureResponse.json();
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

      // Step 2: Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
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
      setImageUrl(result.secure_url);
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleInsertImage = () => {
    // Require alt text for accessibility and SEO
    if (!imageAlt.trim()) {
      setUploadError('Alt text is required for accessibility and SEO');
      return;
    }
    if (imageUrl) {
      onInsert(`![${imageAlt.trim()}](${imageUrl})`);
      setShowImageModal(false);
      setImageUrl('');
      setImageAlt('');
      setUploadError(null);
    }
  };

  const actions: ToolbarAction[] = [
    {
      label: 'Bold',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
        </svg>
      ),
      action: (insert) => insert('**', '**'),
    },
    {
      label: 'Italic',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4"></line>
          <line x1="14" y1="20" x2="5" y2="20"></line>
          <line x1="15" y1="4" x2="9" y2="20"></line>
        </svg>
      ),
      action: (insert) => insert('*', '*'),
    },
    {
      label: 'Strikethrough',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7.1-5.3.6-7 1.6C2.6 6.8 2 8 2 9.6c0 1.7.8 2.9 2.2 3.7 1.6 1 4.3 1.6 7.1 1.7 4.5.2 6.6-1.5 6.6-2.8 0-1.4-1.6-2.4-3.5-2.8"></path>
          <path d="M2.3 20c2.3.6 4.4 1 6.2.9 2.7-.1 5.3-.6 7-1.6 1.5-1.2 2.1-2.4 2.1-4 0-1.7-.8-2.9-2.2-3.7-1.6-1-4.3-1.6-7.1-1.7-4.5-.2-6.6 1.5-6.6 2.8 0 1.4 1.6 2.4 3.5 2.8"></path>
          <line x1="3" y1="12" x2="21" y2="12"></line>
        </svg>
      ),
      action: (insert) => insert('~~', '~~'),
    },
    {
      label: 'Heading 1',
      icon: (
        <span className="font-bold text-[10px] leading-none">H1</span>
      ),
      action: (insert) => insert('# '),
    },
    {
      label: 'Heading 2',
      icon: (
          <span className="font-bold text-[10px] leading-none">H2</span>
      ),
      action: (insert) => insert('## '),
    },
    {
        label: 'Heading 3',
        icon: (
            <span className="font-bold text-[10px] leading-none">H3</span>
        ),
        action: (insert) => insert('### '),
      },
    {
      label: 'Link',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      ),
      action: (insert) => insert('[', '](url)'),
    },
    {
      label: 'Image',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      ),
      action: () => setShowImageModal(true),
      isSpecial: true,
    },
    {
      label: 'Blockquote',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      action: (insert) => insert('> '),
    },
    {
      label: 'Code',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      ),
      action: (insert) => insert('`', '`'),
    },
    {
      label: 'Code Block',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
          <line x1="12" y1="2" x2="12" y2="22"></line>
        </svg>
      ),
      action: (insert) => insert('```\n', '\n```'),
    },
    {
      label: 'Bullet List',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      ),
      action: (insert) => insert('- '),
    },
    {
      label: 'Numbered List',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6"></line>
          <line x1="10" y1="12" x2="21" y2="12"></line>
          <line x1="10" y1="18" x2="21" y2="18"></line>
          <path d="M4 6h1v4"></path>
          <path d="M4 10h2"></path>
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
        </svg>
      ),
      action: (insert) => insert('1. '),
    },
    {
      label: 'Task List',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      ),
      action: (insert) => insert('- [ ] '),
    },
    {
        label: 'Table',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
        ),
        action: (insert) => insert('\n| Col 1 | Col 2 |\n| --- | --- |\n| Val 1 | Val 2 |\n'),
    },
    {
      label: 'Inline Math',
      icon: (
        <span className="font-serif italic text-sm">∑</span>
      ),
      action: (insert) => insert('$', '$'),
    },
    {
        label: 'Block Math',
        icon: (
          <span className="font-serif italic text-sm font-bold">∑∑</span>
        ),
        action: (insert) => insert('$$\n', '\n$$'),
    },
  ];

  return (
    <>
      <div className={`flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg ${className}`}>
        {actions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.isSpecial ? item.action(onInsert) : item.action(onInsert)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
            title={item.label}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Insert Image
            </h3>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) {
                  handleImageUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4
                ${uploading 
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}
              `}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-gray-500">Uploading...</span>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Drop image here or click to upload</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              className="hidden"
            />

            {/* Or URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Alt Text */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alt Text <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Description of the image (required)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Preview */}
            {imageUrl && (
              <div className="mb-4">
                <RawImg
                  src={imageUrl}
                  alt={imageAlt || 'Preview'}
                  className="max-h-32 rounded-lg mx-auto"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              </div>
            )}

            {/* Error */}
            {uploadError && (
              <p className="text-sm text-red-500 mb-4">{uploadError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                  setImageAlt('');
                  setUploadError(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                disabled={!imageUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

