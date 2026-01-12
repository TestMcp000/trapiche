'use client';

import Link, { LinkProps } from 'next/link';
import { AnchorHTMLAttributes } from 'react';

type AdminLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & 
  LinkProps & {
    children: React.ReactNode;
  };

/**
 * Admin-only Link wrapper with prefetch disabled by default.
 * Use this for all admin navigation to prevent unnecessary chunk prefetching.
 */
export default function AdminLink({ 
  children, 
  prefetch = false, 
  ...props 
}: AdminLinkProps) {
  return (
    <Link prefetch={prefetch} {...props}>
      {children}
    </Link>
  );
}
