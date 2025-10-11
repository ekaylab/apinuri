const env = {
  mode: process.env.NODE_ENV,
  api: {
    BASE_URL:
      process.env.NODE_ENV === 'production'
        ? 'https://apinuri.com'
        : 'http://localhost:3000',
    MAIN_API_URL:
      process.env.NODE_ENV === 'production'
        ? 'https://api.apinuri.com'
        : 'http://localhost:4000',
  },
};

export default env;