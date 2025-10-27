const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

// postcss.config.js
module.exports = {
  parser: 'postcss-scss',
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
