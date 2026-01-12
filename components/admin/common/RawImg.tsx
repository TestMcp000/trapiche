'use client';

/**
 * RawImg Component - Admin-only Image Display
 *
 * This component wraps the native `<img>` element for admin tools that cannot
 * use `next/image` due to:
 * - Dynamic blob URLs from cropping/upload previews
 * - Canvas-based image manipulation requirements
 * - External URLs with unknown dimensions
 *
 * USAGE GUIDELINES:
 * - ONLY use in admin components (components/admin/**)
 * - For public-facing images, use `next/image` instead
 * - For SEO-critical images, use optimized sources
 *
 * This centralizes the eslint-disable to avoid scattered suppressions.
 */

import { forwardRef } from 'react';

export type RawImgProps = React.ImgHTMLAttributes<HTMLImageElement>;

const RawImg = forwardRef<HTMLImageElement, RawImgProps>(
  function RawImg(props, ref) {
    /* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- 
       This wrapper intentionally uses native <img> for admin tools. 
       alt is passed via props spread from calling components. */
    return <img ref={ref} {...props} />;
  }
);

export default RawImg;
