// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    // Disable filesystem cache to avoid snapshot errors
    config.cache = false;
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL', // Allows embedding in iframe from any origin
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *", // Allows framing from any origin
          },
        ],
      },
    ];
  },
};
