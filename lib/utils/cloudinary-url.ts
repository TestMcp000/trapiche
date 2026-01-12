/**
 * Cloudinary URL transformation utilities
 * 
 * Pure module - no IO dependencies.
 * Handles image format conversions for web delivery and OG images.
 */

/**
 * Convert a Cloudinary URL to WebP format for optimal web delivery
 * 
 * @param url - Original Cloudinary URL
 * @returns URL with f_webp transformation
 */
export function toWebp(url: string): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  // Check if URL already has transformations (contains /upload/ followed by transformations)
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }
  
  // Insert f_webp,q_auto after /upload/
  const beforeUpload = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const afterUpload = url.substring(uploadIndex + 8);
  
  // Check if there are already transformations
  if (afterUpload.startsWith('v') && /^v\d+\//.test(afterUpload)) {
    // No transformations, just version - insert before version
    return `${beforeUpload}f_webp,q_auto/${afterUpload}`;
  }
  
  // Check if f_webp is already present
  if (afterUpload.includes('f_webp')) {
    return url;
  }
  
  // Add f_webp,q_auto to existing transformations
  return `${beforeUpload}f_webp,q_auto,${afterUpload}`;
}

/**
 * Convert a Cloudinary URL to OG image format (JPEG or PNG)
 * 
 * @param url - Original Cloudinary URL
 * @param format - Output format, defaults to 'jpg'. MUST come from DB field, not runtime inference.
 * @returns URL with OG-optimized transformations (q_auto, c_limit, w_1200, f_jpg/f_png)
 */
export function toOgImage(url: string, format: 'jpg' | 'png' = 'jpg'): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }
  
  const beforeUpload = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const afterUpload = url.substring(uploadIndex + 8);
  
  // Build OG transformations
  const transformations = `f_${format},q_auto,c_limit,w_1200`;
  
  // Check if there are already transformations (not just version)
  if (afterUpload.startsWith('v') && /^v\d+\//.test(afterUpload)) {
    // No existing transformations - insert before version
    return `${beforeUpload}${transformations}/${afterUpload}`;
  }
  
  // Replace existing transformations with OG-optimized ones
  // Find where the actual file path starts (after the last transformation segment)
  const parts = afterUpload.split('/');
  // Find the version or file path
  const filePathIndex = parts.findIndex(p => p.startsWith('v') && /^v\d+$/.test(p));
  
  if (filePathIndex !== -1) {
    // Has version - keep version and everything after
    const filePath = parts.slice(filePathIndex).join('/');
    return `${beforeUpload}${transformations}/${filePath}`;
  }
  
  // No version found - assume last segment is filename
  return `${beforeUpload}${transformations}/${parts[parts.length - 1]}`;
}
