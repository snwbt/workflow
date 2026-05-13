// Mock analytics — PRD Section 22 + PRD v4 §25.1 events

type EventName =
  | 'homepage_viewed'
  | 'rsvp_cta_clicked'
  | 'lookup_started'
  | 'lookup_succeeded'
  | 'lookup_failed'
  | 'rsvp_started'
  | 'rsvp_submitted'
  | 'rsvp_edited'
  | 'confirmation_viewed'
  | 'schedule_viewed'
  | 'travel_viewed'
  | 'admin_dashboard_viewed'
  | 'admin_export_downloaded'
  // PRD v4 new events
  | 'hero_media_loaded'
  | 'section_anchor_clicked'
  | 'rsvp_section_viewed'
  | 'faq_opened'
  | 'registry_clicked'
  | 'reduced_motion_experience_used'
  | 'whatsapp_cta_clicked';

export const trackEvent = (eventName: EventName, properties?: Record<string, any>) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ANALYTICS EVENT]: ${eventName}`, properties || {});
  }
  // In production, send to Mixpanel / PostHog / GA4
};
