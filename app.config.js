// dynamic expo config biar dev + preview bisa kepasang bareng di 1 hp.
// caranya: bedain package/bundleId per APP_VARIANT.
// - development (local `expo run:android` / eas development): com.avaidstudio.paperite
// - preview (eas preview apk): com.avaidstudio.paperite.preview
// - production: com.avaidstudio.paperite
/** @type {import('expo/config').ExpoConfig} */
const base = require('./app.json').expo;

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || 'development';

  if (variant === 'preview') {
    return {
      ...config,
      ...base,
      name: 'paperite preview',
      slug: 'paperite-mobile',
      scheme: 'paperite-mobile-preview',
      ios: {
        ...base.ios,
        bundleIdentifier: 'com.avaidstudio.paperite.preview',
      },
      android: {
        ...base.android,
        package: 'com.avaidstudio.paperite.preview',
      },
    };
  }

  if (variant === 'production') {
    return {
      ...config,
      ...base,
      name: 'paperite',
      slug: 'paperite-mobile',
      scheme: 'paperite-mobile',
    };
  }

  // development / default: sama persis kayak sekarang biar dev build lo ga berubah
  return {
    ...config,
    ...base,
    name: 'paperite-mobile',
    scheme: 'paperite-mobile',
  };
};
