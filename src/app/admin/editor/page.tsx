'use client';

import { useState, useEffect } from 'react';
import {
  formatEventDate,
  fromDateInputValue,
  hasInvalidRsvpDeadline,
  toDateInputValue,
} from '@/lib/eventDisplay';
import styles from './page.module.css';

interface SectionConfig {
  id: string;
  type: string;
  enabled: boolean;
  heading: string;
  bodyCopy: string;
  mediaUrl?: string;
  imageAlt?: string;
  displayMode?: 'image' | 'fallback';
  motionPreset?: string;
  // Hero specific
  eyebrow?: string;
  date?: string;
  venueText?: string;
  ctaLabel?: string;
  ctaLink?: string;
  collageImages?: { url: string; alt?: string }[];
  motionEnabled?: boolean;
  motionSpeed?: number;
  imageScale?: number;
  // Schedule specific
  days?: { label: string; date: string; events: { time: string; title: string; location: string; notes?: string; dressCode?: string; }[] }[];
  noteEnabled?: boolean;
  noteHeading?: string;
  noteBody?: string;
  // FAQ specific
  faqs?: { question: string; answer: string; enabled: boolean }[];
  // At A Glance / Details
  roomText?: string;
  dressCode?: string;
  rsvpText?: string;
  // Generic / Motif
  signOff?: string;
}

const defaultSections: SectionConfig[] = [
  { id: 'hero', type: 'hero', enabled: true, heading: 'Russell & Siaw Min', bodyCopy: 'Together with their families, they invite you to a weekend of celebration.' },
  { id: 'at_a_glance', type: 'at_a_glance', enabled: true, heading: 'A Weekend in Singapore', bodyCopy: '' },
  { id: 'welcome', type: 'welcome', enabled: true, heading: 'A Note From Us', bodyCopy: 'We are so thrilled to share this special moment with the people we love most.' },
  { id: 'schedule', type: 'schedule', enabled: true, heading: 'Our Wedding Weekend', bodyCopy: '' },
  { id: 'venue_reveal', type: 'venue_reveal', enabled: true, heading: 'The Westin Singapore', bodyCopy: 'Set above Marina Bay...' },
  { id: 'travel', type: 'travel', enabled: true, heading: 'Arrival at The Westin', bodyCopy: '' },
  { id: 'gallery_interlude', type: 'gallery_interlude', enabled: true, heading: '', bodyCopy: 'A weekend of family, friends, and the city we love.' },
  { id: 'faq', type: 'faq', enabled: true, heading: 'What to Know', bodyCopy: '' },
  { id: 'closing', type: 'closing', enabled: true, heading: 'We cannot wait to celebrate with you.', bodyCopy: '' },
];

export default function EditorPage() {
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [config, setConfig] = useState<any>({});
  const [activeSectionId, setActiveSectionId] = useState<string>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/cms/sections').then(res => res.json()),
      fetch('/api/admin/config').then(res => res.json())
    ])
    .then(([sectionsData, configData]) => {
      if (sectionsData.sections && sectionsData.sections.length > 0) {
        setSections(sectionsData.sections);
      } else {
        setSections(defaultSections);
      }
      setConfig(configData.config || {});
      setLoading(false);
    })
    .catch(() => {
      setSections(defaultSections);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const resSections = await fetch('/api/admin/cms/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const resConfig = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (resSections.ok && resConfig.ok) {
        setMessage('Changes saved successfully.');
      } else {
        const [sectionsError, configError] = await Promise.all([
          resSections.ok ? Promise.resolve(null) : resSections.json().catch(() => ({})),
          resConfig.ok ? Promise.resolve(null) : resConfig.json().catch(() => ({})),
        ]);
        const failures = [
          !resSections.ok ? `sections (${sectionsError?.error || `HTTP ${resSections.status}`})` : '',
          !resConfig.ok ? `settings (${configError?.error || `HTTP ${resConfig.status}`})` : '',
        ].filter(Boolean);
        setMessage(`Failed to save ${failures.join(' and ')}.`);
      }
    } catch {
      setMessage('Error saving changes.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div style={{padding: '2rem'}}>Loading editor...</div>;

  const activeSection = sections.find(s => s.id === activeSectionId);

  const updateActiveSection = (field: keyof SectionConfig, value: any) => {
    setSections(prev => prev.map(s => 
      s.id === activeSectionId ? { ...s, [field]: value } : s
    ));
  };

  const updateConfig = (field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateConfigFields = (updates: Record<string, any>) => {
    setConfig((prev: any) => ({ ...prev, ...updates }));
  };

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/media/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Failed to upload media.');
    }

    return data.url as string;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('Uploading media...');

    try {
      const url = await uploadMediaFile(file);
      callback(url);
      setMessage('Media uploaded successfully!');
    } catch {
      setMessage('Error uploading media.');
    }

    setUploading(false);
    e.target.value = '';
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGalleryBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    const uploadedImages: { url: string; alt: string }[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setMessage(`Uploading gallery image ${index + 1} of ${files.length}...`);
        const url = await uploadMediaFile(file);
        uploadedImages.push({
          url,
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        });
      }

      updateActiveSection('collageImages', [
        ...(activeSection?.collageImages || []),
        ...uploadedImages,
      ]);
      setMessage(`${uploadedImages.length} gallery image${uploadedImages.length === 1 ? '' : 's'} uploaded.`);
    } catch {
      setMessage(
        uploadedImages.length > 0
          ? `${uploadedImages.length} image${uploadedImages.length === 1 ? '' : 's'} uploaded before one failed.`
          : 'Error uploading gallery images.'
      );
    }

    setUploading(false);
    e.target.value = '';
    setTimeout(() => setMessage(''), 4000);
  };

  // Site Settings Sub-editor
  const renderSiteSettings = () => {
    const invalidRsvpDeadline = hasInvalidRsvpDeadline(config);

    return (
    <div style={{maxWidth: '800px'}}>
      <h3 style={{marginBottom: '1rem'}}>Website Metadata</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>Browser Title</label>
        <input className={styles.input} value={config.SITE_TITLE || ''} onChange={(e) => updateConfig('SITE_TITLE', e.target.value)} placeholder="Wedding RSVP" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Link Preview / Open Graph Title</label>
        <input className={styles.input} value={config.SITE_PREVIEW_TITLE || ''} onChange={(e) => updateConfig('SITE_PREVIEW_TITLE', e.target.value)} placeholder="Russell & Siaw Min - Wedding Celebration" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Link Preview Site Name</label>
        <input className={styles.input} value={config.SITE_PREVIEW_SITE_NAME || ''} onChange={(e) => updateConfig('SITE_PREVIEW_SITE_NAME', e.target.value)} placeholder="Russell & Siaw Min" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Link Preview Description</label>
        <textarea className={styles.textarea} rows={3} value={config.SITE_PREVIEW_DESCRIPTION || ''} onChange={(e) => updateConfig('SITE_PREVIEW_DESCRIPTION', e.target.value)} placeholder="Together with their families, they invite you to a weekend of celebration." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Favicon URL</label>
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <input className={styles.input} style={{flex: 1}} value={config.SITE_FAVICON || ''} onChange={(e) => updateConfig('SITE_FAVICON', e.target.value)} placeholder="/media/favicon.png" />
          <label className={styles.secondaryButton} style={{cursor: 'pointer'}}>
            Upload
            <input type="file" style={{display: 'none'}} accept="image/*" onChange={(e) => handleFileUpload(e, (url) => updateConfig('SITE_FAVICON', url))} />
          </label>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Link Preview Image</label>
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <input className={styles.input} style={{flex: 1}} value={config.SITE_PREVIEW_IMAGE || ''} onChange={(e) => updateConfig('SITE_PREVIEW_IMAGE', e.target.value)} placeholder="/media/preview.jpg" />
          <label className={styles.secondaryButton} style={{cursor: 'pointer'}}>
            Upload
            <input type="file" style={{display: 'none'}} accept="image/*" onChange={(e) => handleFileUpload(e, (url) => updateConfig('SITE_PREVIEW_IMAGE', url))} />
          </label>
        </div>
      </div>

      <h3 style={{marginBottom: '1rem'}}>Design Settings</h3>
      <div className={styles.formGroup} style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
        <label className={styles.label} style={{margin: 0}}>
          <input type="checkbox" checked={config.ENABLE_MOTIF !== false} onChange={(e) => updateConfig('ENABLE_MOTIF', e.target.checked)} style={{marginRight: '0.5rem'}} />
          Enable Signature Motif
        </label>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Signature Motif Text (e.g. R & S or ·)</label>
        <input className={styles.input} value={config.SIGNATURE_MOTIF || ''} onChange={(e) => updateConfig('SIGNATURE_MOTIF', e.target.value)} placeholder="R & S" disabled={config.ENABLE_MOTIF === false} />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Monogram Image</label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input className={styles.input} style={{flex: 1}} placeholder="/media/monogram.svg" value={config.MONOGRAM_IMAGE || ''} onChange={(e) => updateConfig('MONOGRAM_IMAGE', e.target.value)} />
          <label className={styles.secondaryButton} style={{padding: '0.5rem 1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center'}}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" accept="image/*,.svg" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, (url) => updateConfig('MONOGRAM_IMAGE', url))} disabled={uploading} />
          </label>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Monogram Alt Text</label>
        <input className={styles.input} value={config.MONOGRAM_ALT || ''} onChange={(e) => updateConfig('MONOGRAM_ALT', e.target.value)} placeholder="Russell and Siaw Min monogram" />
      </div>
      <div className={styles.formGroup} style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
        <label className={styles.label} style={{margin: 0}}>
          <input type="checkbox" checked={config.ENABLE_MONOGRAM_WATERMARK !== false} onChange={(e) => updateConfig('ENABLE_MONOGRAM_WATERMARK', e.target.checked)} style={{marginRight: '0.5rem'}} />
          Enable Monogram Watermarks
        </label>
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>23 October Venue Details (Google Maps)</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Name</label>
        <input className={styles.input} value={config.VENUE_NAME || ''} onChange={(e) => updateConfig('VENUE_NAME', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Address</label>
        <input className={styles.input} value={config.VENUE_ADDRESS || ''} onChange={(e) => updateConfig('VENUE_ADDRESS', e.target.value)} />
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Latitude</label>
          <input type="number" step="any" className={styles.input} value={config.VENUE_LAT || ''} onChange={(e) => updateConfig('VENUE_LAT', parseFloat(e.target.value))} />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Longitude</label>
          <input type="number" step="any" className={styles.input} value={config.VENUE_LNG || ''} onChange={(e) => updateConfig('VENUE_LNG', parseFloat(e.target.value))} />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Arrival / Parking Note</label>
        <input className={styles.input} value={config.VENUE_ARRIVAL_NOTE || ''} onChange={(e) => updateConfig('VENUE_ARRIVAL_NOTE', e.target.value)} />
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>24 October Venue Details (Google Maps)</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Name</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_NAME || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_NAME', e.target.value)} placeholder="Church of the Holy Family" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Address</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_ADDRESS || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_ADDRESS', e.target.value)} />
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Latitude</label>
          <input type="number" step="any" className={styles.input} value={config.VENUE_DAY_TWO_LAT || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_LAT', parseFloat(e.target.value))} />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Longitude</label>
          <input type="number" step="any" className={styles.input} value={config.VENUE_DAY_TWO_LNG || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_LNG', parseFloat(e.target.value))} />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Arrival / Parking Note</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_ARRIVAL_NOTE || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_ARRIVAL_NOTE', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Illustration Image</label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input className={styles.input} style={{flex: 1}} placeholder="/media/image.jpg" value={config.VENUE_DAY_TWO_IMAGE || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_IMAGE', e.target.value)} />
          <label className={styles.secondaryButton} style={{padding: '0.5rem 1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center'}}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, (url) => updateConfig('VENUE_DAY_TWO_IMAGE', url))} disabled={uploading} />
          </label>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Illustration Alt Text</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_IMAGE_ALT || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_IMAGE_ALT', e.target.value)} />
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>WhatsApp Concierge</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>WhatsApp Phone Number (include country code, e.g. 1234567890)</label>
        <input className={styles.input} value={config.WHATSAPP_NUMBER || ''} onChange={(e) => updateConfig('WHATSAPP_NUMBER', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Concierge Label</label>
        <input className={styles.input} value={config.WHATSAPP_LABEL || ''} onChange={(e) => updateConfig('WHATSAPP_LABEL', e.target.value)} placeholder="Message Us" />
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>23 October Travel & Directions</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>MRT Station</label>
        <input className={styles.input} value={config.TRAVEL_MRT_STATION || ''} onChange={(e) => updateConfig('TRAVEL_MRT_STATION', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>MRT Directions</label>
        <textarea className={styles.textarea} value={config.TRAVEL_MRT_DIRECTIONS || ''} onChange={(e) => updateConfig('TRAVEL_MRT_DIRECTIONS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Bus Stop</label>
        <input className={styles.input} value={config.TRAVEL_BUS_STOP || ''} onChange={(e) => updateConfig('TRAVEL_BUS_STOP', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Bus Directions</label>
        <textarea className={styles.textarea} value={config.TRAVEL_BUS_DIRECTIONS || ''} onChange={(e) => updateConfig('TRAVEL_BUS_DIRECTIONS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Driving & Parking Info</label>
        <textarea className={styles.textarea} value={config.TRAVEL_PARKING || ''} onChange={(e) => updateConfig('TRAVEL_PARKING', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Drop-off Info</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DROPOFF || ''} onChange={(e) => updateConfig('TRAVEL_DROPOFF', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Hotel-to-Ballroom Directions</label>
        <textarea className={styles.textarea} value={config.TRAVEL_HOTEL_DIRECTIONS || ''} onChange={(e) => updateConfig('TRAVEL_HOTEL_DIRECTIONS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Accessibility Notes</label>
        <textarea className={styles.textarea} value={config.TRAVEL_ACCESSIBILITY || ''} onChange={(e) => updateConfig('TRAVEL_ACCESSIBILITY', e.target.value)} />
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>24 October Travel & Directions</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>MRT Station</label>
        <input className={styles.input} value={config.TRAVEL_DAY_TWO_MRT_STATION || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_MRT_STATION', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>MRT Directions</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DAY_TWO_MRT_DIRECTIONS || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_MRT_DIRECTIONS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Bus Stop</label>
        <input className={styles.input} value={config.TRAVEL_DAY_TWO_BUS_STOP || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_BUS_STOP', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Bus Directions</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DAY_TWO_BUS_DIRECTIONS || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_BUS_DIRECTIONS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Driving & Parking Info</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DAY_TWO_PARKING || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_PARKING', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Drop-off Info</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DAY_TWO_DROPOFF || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_DROPOFF', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Hotel-to-Venue Directions</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DAY_TWO_HOTEL_DIRECTIONS || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_HOTEL_DIRECTIONS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Accessibility Notes</label>
        <textarea className={styles.textarea} value={config.TRAVEL_DAY_TWO_ACCESSIBILITY || ''} onChange={(e) => updateConfig('TRAVEL_DAY_TWO_ACCESSIBILITY', e.target.value)} />
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>RSVP Configuration</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>Couple Names</label>
        <input className={styles.input} value={config.COUPLE_NAMES || ''} onChange={(e) => updateConfig('COUPLE_NAMES', e.target.value)} placeholder="Russell & Siaw Min" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Wedding Date</label>
        <input type="date" className={styles.input} value={toDateInputValue(config.WEDDING_DATE)} onChange={(e) => updateConfig('WEDDING_DATE', fromDateInputValue(e.target.value))} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>RSVP Deadline</label>
        <input type="date" className={styles.input} value={toDateInputValue(config.RSVP_DEADLINE)} onChange={(e) => {
          const nextDeadline = fromDateInputValue(e.target.value);
          updateConfigFields({
            RSVP_DEADLINE: nextDeadline,
            RSVP_DEADLINE_DISPLAY: formatEventDate(nextDeadline, ''),
          });
        }} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>RSVP Deadline Display Text</label>
        <input className={styles.input} value={config.RSVP_DEADLINE_DISPLAY || ''} onChange={(e) => updateConfig('RSVP_DEADLINE_DISPLAY', e.target.value)} placeholder="June 25, 2026" />
      </div>
      {invalidRsvpDeadline && (
        <p role="alert" style={{color: '#8a3b2d', background: '#fff4ef', border: '1px solid #e3b5a9', padding: '0.75rem 1rem', marginBottom: '1rem'}}>
          RSVP deadline should be before the wedding date.
        </p>
      )}

      <h4 style={{marginTop: '1.5rem', marginBottom: '1rem'}}>Invite Code Flow</h4>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Friday + Saturday Invite Code</label>
          <input className={styles.input} value={config.RSVP_INVITE_CODE_FRIDAY_SATURDAY || ''} onChange={(e) => updateConfig('RSVP_INVITE_CODE_FRIDAY_SATURDAY', e.target.value)} placeholder="FRISAT" />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Saturday-only Invite Code</label>
          <input className={styles.input} value={config.RSVP_INVITE_CODE_SATURDAY || ''} onChange={(e) => updateConfig('RSVP_INVITE_CODE_SATURDAY', e.target.value)} placeholder="SATURDAY" />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>RSVP Confirmation Message</label>
        <input className={styles.input} value={config.RSVP_CONFIRMATION_MESSAGE || ''} onChange={(e) => updateConfig('RSVP_CONFIRMATION_MESSAGE', e.target.value)} placeholder="Thank you! We'll see you in October." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>RSVP Initial Heading</label>
        <input className={styles.input} value={config.RSVP_INITIAL_HEADING || ''} onChange={(e) => updateConfig('RSVP_INITIAL_HEADING', e.target.value)} placeholder="Begin With Your Invitation" />
      </div>

      <h4 style={{marginTop: '1.5rem', marginBottom: '1rem'}}>RSVP Field Labels</h4>
      <div className={styles.formGroup}>
        <label className={styles.label}>Invite Code Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_INVITE_CODE || ''} onChange={(e) => updateConfig('RSVP_LABEL_INVITE_CODE', e.target.value)} placeholder="Invite code" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Guest Count Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_GUEST_COUNT || ''} onChange={(e) => updateConfig('RSVP_LABEL_GUEST_COUNT', e.target.value)} placeholder="Number of guests attending (including yourself)" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Plus-One Names Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_ADDITIONAL_GUESTS || ''} onChange={(e) => updateConfig('RSVP_LABEL_ADDITIONAL_GUESTS', e.target.value)} placeholder="Spouse / plus-one names" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Dietary Restrictions Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_DIETARY || ''} onChange={(e) => updateConfig('RSVP_LABEL_DIETARY', e.target.value)} placeholder="Dietary restrictions" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Accessibility Requirements Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_ACCESSIBILITY || ''} onChange={(e) => updateConfig('RSVP_LABEL_ACCESSIBILITY', e.target.value)} placeholder="Accessibility requirements" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Dinner Attendance Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_DINNER_ATTENDANCE || ''} onChange={(e) => updateConfig('RSVP_LABEL_DINNER_ATTENDANCE', e.target.value)} placeholder="Will you attend the dinner reception on 23 October?" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Mass Attendance Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_MASS_ATTENDANCE || ''} onChange={(e) => updateConfig('RSVP_LABEL_MASS_ATTENDANCE', e.target.value)} placeholder="Will you attend the solemnisation Mass on 24 October?" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Message Label</label>
        <input className={styles.input} value={config.RSVP_LABEL_MESSAGE || ''} onChange={(e) => updateConfig('RSVP_LABEL_MESSAGE', e.target.value)} placeholder="Note to the couple" />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Custom RSVP Questions</label>
        {(config.RSVP_CUSTOM_QUESTIONS || []).map((q: any, i: number) => (
          <div key={i} style={{padding: '1rem', border: '1px solid var(--color-border)', marginBottom: '1rem', borderRadius: '4px'}}>
            <div style={{display: 'flex', gap: '1rem', marginBottom: '0.5rem'}}>
              <input className={styles.input} style={{flex: 1}} placeholder="Question Label" value={q.label} onChange={(e) => {
                const newQ = [...config.RSVP_CUSTOM_QUESTIONS];
                newQ[i].label = e.target.value;
                updateConfig('RSVP_CUSTOM_QUESTIONS', newQ);
              }} />
              <select className={styles.select} value={q.type} onChange={(e) => {
                const newQ = [...config.RSVP_CUSTOM_QUESTIONS];
                newQ[i].type = e.target.value;
                updateConfig('RSVP_CUSTOM_QUESTIONS', newQ);
              }}>
                <option value="text">Text Input</option>
                <option value="dropdown">Dropdown</option>
              </select>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <input type="checkbox" checked={q.required} onChange={(e) => {
                  const newQ = [...config.RSVP_CUSTOM_QUESTIONS];
                  newQ[i].required = e.target.checked;
                  updateConfig('RSVP_CUSTOM_QUESTIONS', newQ);
                }} /> Required
              </label>
              <button className={styles.secondaryButton} style={{color: 'red', borderColor: 'red'}} onClick={() => {
                const newQ = config.RSVP_CUSTOM_QUESTIONS.filter((_: any, idx: number) => idx !== i);
                updateConfig('RSVP_CUSTOM_QUESTIONS', newQ);
              }}>Remove</button>
            </div>
            {q.type === 'dropdown' && (
              <div>
                <label className={styles.label}>Options (comma separated)</label>
                <input className={styles.input} value={(q.options || []).join(', ')} onChange={(e) => {
                  const newQ = [...config.RSVP_CUSTOM_QUESTIONS];
                  newQ[i].options = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                  updateConfig('RSVP_CUSTOM_QUESTIONS', newQ);
                }} />
              </div>
            )}
          </div>
        ))}
        <button className={styles.secondaryButton} onClick={() => {
          updateConfig('RSVP_CUSTOM_QUESTIONS', [...(config.RSVP_CUSTOM_QUESTIONS || []), { label: '', type: 'text', required: false, options: [] }]);
        }}>+ Add Custom Question</button>
      </div>

    </div>
  );
  };

  // Hero Sub-editor
  const renderHeroEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Eyebrow Text</label>
        <input className={styles.input} value={activeSection?.eyebrow || ''} onChange={(e) => updateActiveSection('eyebrow', e.target.value)} placeholder="e.g. The Wedding Of" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Main Heading (Couple Names)</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Date Text</label>
        <input className={styles.input} value={activeSection?.date || ''} onChange={(e) => updateActiveSection('date', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Text (one venue per line)</label>
        <textarea className={styles.textarea} rows={3} value={activeSection?.venueText || ''} onChange={(e) => updateActiveSection('venueText', e.target.value)} />
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>CTA Label</label>
          <input className={styles.input} value={activeSection?.ctaLabel || ''} onChange={(e) => updateActiveSection('ctaLabel', e.target.value)} />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>CTA Link</label>
          <input className={styles.input} value={activeSection?.ctaLink || ''} onChange={(e) => updateActiveSection('ctaLink', e.target.value)} />
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Collage Images (Up to 3)</label>
        {(activeSection?.collageImages || []).map((img, i) => (
          <div key={i} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center'}}>
            <span style={{width: '20px'}}>{i+1}.</span>
            <input className={styles.input} style={{flex: 1}} placeholder="Image URL" value={img.url} onChange={(e) => {
              const newImgs = [...(activeSection?.collageImages || [])];
              newImgs[i].url = e.target.value;
              updateActiveSection('collageImages', newImgs);
            }} />
            <label className={styles.secondaryButton} style={{cursor: 'pointer'}}>
              Upload
              <input type="file" style={{display: 'none'}} accept="image/*" onChange={(e) => handleFileUpload(e, (url) => {
                const newImgs = [...(activeSection?.collageImages || [])];
                newImgs[i].url = url;
                updateActiveSection('collageImages', newImgs);
              })} />
            </label>
            <button className={styles.secondaryButton} style={{color: 'red', borderColor: 'red'}} onClick={() => {
              const newImgs = (activeSection?.collageImages || []).filter((_, idx) => idx !== i);
              updateActiveSection('collageImages', newImgs);
            }}>X</button>
          </div>
        ))}
        {(activeSection?.collageImages || []).length < 3 && (
          <button className={styles.secondaryButton} onClick={() => {
            updateActiveSection('collageImages', [...(activeSection?.collageImages || []), { url: '', alt: '' }]);
          }}>+ Add Image</button>
        )}
      </div>
    </>
  );

  // Schedule Sub-editor
  const renderScheduleEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Schedule Title</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Schedule Intro</label>
        <textarea className={styles.textarea} value={activeSection?.bodyCopy || ''} onChange={(e) => updateActiveSection('bodyCopy', e.target.value)} />
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Schedule Days</label>
        {(activeSection?.days || []).map((day, dIdx) => (
          <div key={dIdx} style={{padding: '1rem', border: '1px solid var(--color-border)', marginBottom: '1rem', borderRadius: '4px'}}>
            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
              <div style={{flex: 1}}>
                <label className={styles.label}>Day Label (e.g. Day One)</label>
                <input className={styles.input} value={day.label} onChange={(e) => {
                  const newDays = [...(activeSection?.days || [])];
                  newDays[dIdx].label = e.target.value;
                  updateActiveSection('days', newDays);
                }} />
              </div>
              <div style={{flex: 1}}>
                <label className={styles.label}>Date (e.g. Friday, Dec 12)</label>
                <input className={styles.input} value={day.date} onChange={(e) => {
                  const newDays = [...(activeSection?.days || [])];
                  newDays[dIdx].date = e.target.value;
                  updateActiveSection('days', newDays);
                }} />
              </div>
              <button className={styles.secondaryButton} style={{alignSelf: 'flex-end', color: 'red', borderColor: 'red'}} onClick={() => {
                const newDays = (activeSection?.days || []).filter((_, i) => i !== dIdx);
                updateActiveSection('days', newDays);
              }}>Remove Day</button>
            </div>
            
            <h4 style={{marginBottom: '0.5rem', fontSize: '0.875rem'}}>Events</h4>
            {(day.events || []).map((evt, eIdx) => (
              <div key={eIdx} style={{padding: '0.5rem', background: 'var(--color-bg)', marginBottom: '0.5rem', borderRadius: '4px'}}>
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                  <input className={styles.input} style={{width: '100px'}} placeholder="Time" value={evt.time} onChange={(e) => {
                    const newDays = [...(activeSection?.days || [])];
                    newDays[dIdx].events[eIdx].time = e.target.value;
                    updateActiveSection('days', newDays);
                  }} />
                  <input className={styles.input} style={{flex: 1}} placeholder="Title" value={evt.title} onChange={(e) => {
                    const newDays = [...(activeSection?.days || [])];
                    newDays[dIdx].events[eIdx].title = e.target.value;
                    updateActiveSection('days', newDays);
                  }} />
                  <input className={styles.input} style={{flex: 1}} placeholder="Location" value={evt.location} onChange={(e) => {
                    const newDays = [...(activeSection?.days || [])];
                    newDays[dIdx].events[eIdx].location = e.target.value;
                    updateActiveSection('days', newDays);
                  }} />
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input className={styles.input} style={{flex: 2}} placeholder="Notes (Optional)" value={evt.notes || ''} onChange={(e) => {
                    const newDays = [...(activeSection?.days || [])];
                    newDays[dIdx].events[eIdx].notes = e.target.value;
                    updateActiveSection('days', newDays);
                  }} />
                  <input className={styles.input} style={{flex: 1}} placeholder="Dress Code (Optional)" value={evt.dressCode || ''} onChange={(e) => {
                    const newDays = [...(activeSection?.days || [])];
                    newDays[dIdx].events[eIdx].dressCode = e.target.value;
                    updateActiveSection('days', newDays);
                  }} />
                  <button className={styles.secondaryButton} style={{color: 'red', borderColor: 'red'}} onClick={() => {
                    const newDays = [...(activeSection?.days || [])];
                    newDays[dIdx].events = newDays[dIdx].events.filter((_, i) => i !== eIdx);
                    updateActiveSection('days', newDays);
                  }}>X</button>
                </div>
              </div>
            ))}
            <button className={styles.secondaryButton} onClick={() => {
              const newDays = [...(activeSection?.days || [])];
              newDays[dIdx].events.push({ time: '', title: '', location: '' });
              updateActiveSection('days', newDays);
            }}>+ Add Event</button>
          </div>
        ))}
        <button className={styles.secondaryButton} onClick={() => {
          updateActiveSection('days', [...(activeSection?.days || []), { label: 'New Day', date: '', events: [] }]);
        }}>+ Add Day</button>
      </div>

      <div className={styles.formGroup}>
        <h3 style={{marginBottom: '1rem'}}>Message Under Schedule</h3>
        <label className={styles.label} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <input
            type="checkbox"
            checked={activeSection?.noteEnabled !== false}
            onChange={(e) => updateActiveSection('noteEnabled', e.target.checked)}
          />
          Show message under schedule
        </label>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Message Heading</label>
        <input
          className={styles.input}
          value={activeSection?.noteHeading || ''}
          onChange={(e) => updateActiveSection('noteHeading', e.target.value)}
          placeholder="A note about the weekend"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Message Body</label>
        <textarea
          className={styles.textarea}
          rows={4}
          value={activeSection?.noteBody || ''}
          onChange={(e) => updateActiveSection('noteBody', e.target.value)}
          placeholder="Share a short message explaining the two celebrations."
        />
      </div>
    </>
  );

  // FAQ Sub-editor
  const renderFaqEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>FAQ Title</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Questions & Answers</label>
        {(activeSection?.faqs || []).map((faq, idx) => (
          <div key={idx} style={{padding: '1rem', border: '1px solid var(--color-border)', marginBottom: '1rem', borderRadius: '4px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <input type="checkbox" checked={faq.enabled !== false} onChange={(e) => {
                  const newFaqs = [...(activeSection?.faqs || [])];
                  newFaqs[idx].enabled = e.target.checked;
                  updateActiveSection('faqs', newFaqs);
                }} /> Enabled
              </label>
              <button className={styles.secondaryButton} style={{color: 'red', borderColor: 'red', padding: '0.25rem 0.5rem'}} onClick={() => {
                const newFaqs = (activeSection?.faqs || []).filter((_, i) => i !== idx);
                updateActiveSection('faqs', newFaqs);
              }}>Remove</button>
            </div>
            <input className={styles.input} style={{marginBottom: '0.5rem'}} placeholder="Question" value={faq.question} onChange={(e) => {
              const newFaqs = [...(activeSection?.faqs || [])];
              newFaqs[idx].question = e.target.value;
              updateActiveSection('faqs', newFaqs);
            }} />
            <textarea className={styles.textarea} rows={3} placeholder="Answer" value={faq.answer} onChange={(e) => {
              const newFaqs = [...(activeSection?.faqs || [])];
              newFaqs[idx].answer = e.target.value;
              updateActiveSection('faqs', newFaqs);
            }} />
          </div>
        ))}
        <button className={styles.secondaryButton} onClick={() => {
          updateActiveSection('faqs', [...(activeSection?.faqs || []), { question: '', answer: '', enabled: true }]);
        }}>+ Add Question</button>
      </div>
    </>
  );

  // Closing Sub-editor
  const renderClosingEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Closing Message</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Sign-off (e.g. Russell & Siaw Min)</label>
        <input className={styles.input} value={activeSection?.signOff || ''} onChange={(e) => updateActiveSection('signOff', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Date</label>
        <input className={styles.input} value={activeSection?.date || ''} onChange={(e) => updateActiveSection('date', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Text (one venue per line)</label>
        <textarea className={styles.textarea} rows={3} value={activeSection?.venueText || ''} onChange={(e) => updateActiveSection('venueText', e.target.value)} placeholder={[config.VENUE_NAME, config.VENUE_DAY_TWO_NAME].filter(Boolean).join('\n') || 'The Westin Singapore'} />
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>CTA Label</label>
          <input className={styles.input} value={activeSection?.ctaLabel || ''} onChange={(e) => updateActiveSection('ctaLabel', e.target.value)} />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>CTA Link</label>
          <input className={styles.input} value={activeSection?.ctaLink || ''} onChange={(e) => updateActiveSection('ctaLink', e.target.value)} />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Background Image</label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input className={styles.input} style={{flex: 1}} placeholder="/media/image.jpg" value={activeSection?.mediaUrl || ''} onChange={(e) => updateActiveSection('mediaUrl', e.target.value)} />
          <label className={styles.secondaryButton} style={{padding: '0.5rem 1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center'}}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, (url) => updateActiveSection('mediaUrl', url))} disabled={uploading} />
          </label>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Background Image Alt Text</label>
        <input className={styles.input} value={activeSection?.imageAlt || ''} onChange={(e) => updateActiveSection('imageAlt', e.target.value)} placeholder="Russell and Siaw Min" />
      </div>
    </>
  );

  // Venue Reveal Sub-editor
  const renderVenueRevealEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Reveal Title</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Description</label>
        <textarea className={styles.textarea} value={activeSection?.bodyCopy || ''} onChange={(e) => updateActiveSection('bodyCopy', e.target.value)} />
      </div>
      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>Friday / Westin Illustration</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>Westin Illustration Image</label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input className={styles.input} style={{flex: 1}} placeholder="/media/westin-illustration.jpg" value={activeSection?.mediaUrl || ''} onChange={(e) => updateActiveSection('mediaUrl', e.target.value)} />
          <label className={styles.secondaryButton} style={{padding: '0.5rem 1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center'}}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, (url) => updateActiveSection('mediaUrl', url))} disabled={uploading} />
          </label>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Westin Illustration Alt Text</label>
        <input className={styles.input} value={activeSection?.imageAlt || ''} onChange={(e) => updateActiveSection('imageAlt', e.target.value)} placeholder="The Westin Singapore Grand Ballroom" />
      </div>

      <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>Saturday / Church Illustration</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>Church Venue Name</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_NAME || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_NAME', e.target.value)} placeholder="Church of the Holy Family" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Church Venue Address</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_ADDRESS || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_ADDRESS', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Church Illustration Image</label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input className={styles.input} style={{flex: 1}} placeholder="/media/church-illustration.jpg" value={config.VENUE_DAY_TWO_IMAGE || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_IMAGE', e.target.value)} />
          <label className={styles.secondaryButton} style={{padding: '0.5rem 1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center'}}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, (url) => updateConfig('VENUE_DAY_TWO_IMAGE', url))} disabled={uploading} />
          </label>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Church Illustration Alt Text</label>
        <input className={styles.input} value={config.VENUE_DAY_TWO_IMAGE_ALT || ''} onChange={(e) => updateConfig('VENUE_DAY_TWO_IMAGE_ALT', e.target.value)} placeholder="Church of the Holy Family illustration" />
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>CTA Label</label>
          <input className={styles.input} value={activeSection?.ctaLabel || ''} onChange={(e) => updateActiveSection('ctaLabel', e.target.value)} placeholder="Get Directions" />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Directions Link Override</label>
          <input className={styles.input} value={activeSection?.ctaLink || ''} onChange={(e) => updateActiveSection('ctaLink', e.target.value)} placeholder="Leave blank to use address/map coordinates" />
        </div>
      </div>
    </>
  );

  // At A Glance Sub-editor
  const renderAtAGlanceEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Section Heading</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Date Line</label>
        <input className={styles.input} value={activeSection?.date || ''} onChange={(e) => updateActiveSection('date', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Venue Line</label>
        <input className={styles.input} value={activeSection?.venueText || ''} onChange={(e) => updateActiveSection('venueText', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Room / Location Details</label>
        <input className={styles.input} value={activeSection?.roomText || ''} onChange={(e) => updateActiveSection('roomText', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Dress Code</label>
        <input className={styles.input} value={activeSection?.dressCode || ''} onChange={(e) => updateActiveSection('dressCode', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>RSVP Reminder Line</label>
        <input className={styles.input} value={activeSection?.rsvpText || ''} onChange={(e) => updateActiveSection('rsvpText', e.target.value)} />
      </div>
    </>
  );

  // Gallery Sub-editor
  const renderGalleryEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Caption / Short Copy</label>
        <input className={styles.input} value={activeSection?.bodyCopy || ''} onChange={(e) => updateActiveSection('bodyCopy', e.target.value)} />
      </div>
      <div className={styles.formGroup} style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
        <label className={styles.label} style={{margin: 0}}>
          <input type="checkbox" checked={activeSection?.motionEnabled !== false} onChange={(e) => updateActiveSection('motionEnabled', e.target.checked)} style={{marginRight: '0.5rem'}} />
          Enable slow gallery movement
        </label>
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Motion Speed</label>
          <input type="number" min="0.5" max="2" step="0.1" className={styles.input} value={activeSection?.motionSpeed || 1} onChange={(e) => updateActiveSection('motionSpeed', Number(e.target.value))} />
        </div>
        <div className={styles.formGroup} style={{flex: 1}}>
          <label className={styles.label}>Image Scale</label>
          <input type="number" min="1" max="1.2" step="0.01" className={styles.input} value={activeSection?.imageScale || 1} onChange={(e) => updateActiveSection('imageScale', Number(e.target.value))} />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Detail Images</label>
        <label className={styles.secondaryButton} style={{display: 'inline-flex', marginBottom: '0.75rem', cursor: 'pointer'}}>
          {uploading ? 'Uploading...' : 'Bulk Upload Images'}
          <input
            type="file"
            style={{display: 'none'}}
            accept="image/*"
            multiple
            onChange={handleGalleryBulkUpload}
            disabled={uploading}
          />
        </label>
        {(activeSection?.collageImages || []).map((img, i) => (
          <div key={i} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center'}}>
            <span style={{width: '20px'}}>{i+1}.</span>
            <input className={styles.input} style={{flex: 1}} placeholder="Image URL" value={img.url} onChange={(e) => {
              const newImgs = [...(activeSection?.collageImages || [])];
              newImgs[i].url = e.target.value;
              updateActiveSection('collageImages', newImgs);
            }} />
            <label className={styles.secondaryButton} style={{cursor: 'pointer'}}>
              Upload
              <input type="file" style={{display: 'none'}} accept="image/*" onChange={(e) => handleFileUpload(e, (url) => {
                const newImgs = [...(activeSection?.collageImages || [])];
                newImgs[i].url = url;
                updateActiveSection('collageImages', newImgs);
              })} />
            </label>
            <button className={styles.secondaryButton} style={{color: 'red', borderColor: 'red'}} onClick={() => {
              const newImgs = (activeSection?.collageImages || []).filter((_, idx) => idx !== i);
              updateActiveSection('collageImages', newImgs);
            }}>X</button>
          </div>
        ))}
        <button className={styles.secondaryButton} onClick={() => {
          updateActiveSection('collageImages', [...(activeSection?.collageImages || []), { url: '', alt: '' }]);
        }}>+ Add Image</button>
      </div>
    </>
  );

  // Generic Sub-editor (Welcome, Travel)
  const renderGenericEditor = () => (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Heading</label>
        <input className={styles.input} value={activeSection?.heading || ''} onChange={(e) => updateActiveSection('heading', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Body Copy</label>
        <textarea className={styles.textarea} value={activeSection?.bodyCopy || ''} onChange={(e) => updateActiveSection('bodyCopy', e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Media URL</label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input className={styles.input} style={{flex: 1}} placeholder="/media/image.jpg" value={activeSection?.mediaUrl || ''} onChange={(e) => updateActiveSection('mediaUrl', e.target.value)} />
          <label className={styles.secondaryButton} style={{padding: '0.5rem 1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center'}}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" accept="image/*,video/*" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, (url) => updateActiveSection('mediaUrl', url))} disabled={uploading} />
          </label>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.title}>Sections</h2>
        </div>
        <div className={styles.sectionList}>
          <button className={`${styles.sectionItem} ${activeSectionId === 'config' ? styles.active : ''}`} onClick={() => setActiveSectionId('config')}>
            Site Settings
          </button>
          <div style={{height: '1px', background: 'var(--color-border)', margin: 'var(--spacing-2) 0'}}></div>
          {sections.map(section => (
            <button key={section.id} className={`${styles.sectionItem} ${section.id === activeSectionId ? styles.active : ''}`} onClick={() => setActiveSectionId(section.id)}>
              {section.type.charAt(0).toUpperCase() + section.type.slice(1)} Section
            </button>
          ))}
        </div>
      </aside>

      <main className={styles.editor}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {activeSectionId === 'config' ? 'Site Settings' : `Edit ${activeSection?.type}`}
          </h2>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            {message && <span style={{color: 'green', fontSize: '0.875rem'}}>{message}</span>}
            <button className={styles.primaryButton} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Publish Changes'}
            </button>
          </div>
        </div>

        {activeSectionId === 'config' ? renderSiteSettings() : (
          <div style={{maxWidth: '800px'}}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <input type="checkbox" checked={activeSection?.enabled} onChange={(e) => updateActiveSection('enabled', e.target.checked)} style={{marginRight: '0.5rem'}} />
                Enable Section
              </label>
            </div>
            {activeSection?.type === 'hero' && renderHeroEditor()}
            {activeSection?.type === 'at_a_glance' && renderAtAGlanceEditor()}
            {activeSection?.type === 'schedule' && renderScheduleEditor()}
            {activeSection?.type === 'venue_reveal' && renderVenueRevealEditor()}
            {activeSection?.type === 'faq' && renderFaqEditor()}
            {activeSection?.type === 'closing' && renderClosingEditor()}
            {activeSection?.type === 'gallery_interlude' && renderGalleryEditor()}
            {(activeSection?.type === 'welcome' || activeSection?.type === 'travel') && renderGenericEditor()}
          </div>
        )}
      </main>
    </div>
  );
}
