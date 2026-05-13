import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old standalone routes → homepage anchor sections
      { source: '/rsvp/lookup', destination: '/#rsvp', permanent: false },
      { source: '/rsvp/form',   destination: '/#rsvp', permanent: false },
      { source: '/schedule',    destination: '/#schedule', permanent: false },
      { source: '/travel',      destination: '/#travel', permanent: false },
      { source: '/faq',         destination: '/#faq', permanent: false },
    ];
  },
};

export default nextConfig;
