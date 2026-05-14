import 'server-only';

import type { Metadata } from 'next';
import { getDb } from './db';

const FALLBACK_TITLE = 'Wedding RSVP';
const FALLBACK_DESCRIPTION = 'A private, mobile-first wedding RSVP website';

function asString(value: unknown) {
  return String(value || '').trim();
}

function absoluteUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (!siteUrl) return value;
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function withVersion(url: string, version: string) {
  if (!url || !version) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

export async function getSiteMetadata(): Promise<Metadata> {
  const db = await getDb();
  const config = db.config || {};
  const title = asString(config.SITE_TITLE) || FALLBACK_TITLE;
  const previewTitle = asString(config.SITE_PREVIEW_TITLE) || title;
  const siteName = asString(config.SITE_PREVIEW_SITE_NAME) || previewTitle;
  const description = asString(config.SITE_PREVIEW_DESCRIPTION) || FALLBACK_DESCRIPTION;
  const previewImage = absoluteUrl(asString(config.SITE_PREVIEW_IMAGE));
  const favicon = asString(config.SITE_FAVICON);
  const faviconVersion = asString(config.SITE_FAVICON_VERSION);
  const faviconUrl = withVersion(favicon, faviconVersion);
  const faviconIsIco = /\.ico(?:$|[?#])/i.test(favicon);
  const icons = faviconUrl
    ? {
        icon: faviconUrl,
        shortcut: faviconUrl,
        ...(faviconIsIco ? {} : { apple: faviconUrl }),
      }
    : undefined;
  const images = previewImage ? [{ url: previewImage }] : undefined;

  return {
    title,
    description,
    icons,
    openGraph: {
      title: previewTitle,
      description,
      siteName,
      type: 'website',
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: previewTitle,
      description,
      images: previewImage ? [previewImage] : undefined,
    },
  };
}
