/**
 * @type {import('next').NextConfig}
 */

const { withExpo } = require("@expo/next-adapter");
const withFonts = require("next-fonts");
const withImages = require("next-images");
const withPlugins = require("next-compose-plugins");
const withSentryConfig = require("@sentry/nextjs");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const withTM = require("next-transpile-modules")([
  "app",
  "@gorhom/bottom-sheet",
  "@gorhom/portal",
  "dripsy",
  "@dripsy/core",
  "@dripsy/gradient",
  "twrnc",
  "moti",
  "@motify/components",
  "@motify/core",
  "expo-next-react-navigation",
  "@zeego/menu",
  "@zeego/dropdown-menu",
  "solito",
  "three",
  "tailwindcss-react-native",
  "@react-native-community/hooks",
]);

const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  experimental: {
    optimizeCss: true,
    esmExternals: "loose",
    reactRoot: true,
    // nextScriptWorkers: true,
    // TODO: enable `concurrentFeatures: true`
  },
  typescript: {
    ignoreDevErrors: true,
    ignoreBuildErrors: true,
  },
  outputFileTracing: false, // https://github.com/vercel/next.js/issues/30601#issuecomment-961323914
  images: {
    disableStaticImages: true,
    domains: [
      "lh3.googleusercontent.com",
      "cloudflare-ipfs.com",
      "cdn.tryshowtime.com",
      "storage.googleapis.com",
      "testingservice-dot-showtimenft.wl.r.appspot.com",
    ],
  },
  async headers() {
    const cacheHeaders = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];
    return [
      { source: "/_next/static/:static*", headers: cacheHeaders },
      { source: "/fonts/:font*", headers: cacheHeaders },
    ];
  },
  async redirects() {
    return [
      {
        source: "/discord",
        destination: "https://discord.gg/FBSxXrcnsm",
        permanent: true,
      },
      {
        source: "/feedback",
        destination: "https://showtime.nolt.io",
        permanent: true,
      },
      {
        source: "/t/:path*",
        destination: "/nft/:path*",
        permanent: true,
      },
      {
        source: "/token/:path*",
        destination: "/nft/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/@:username",
        destination: "/profile/:username",
      },
      {
        source: "/login",
        destination: "/?login=true",
      },
    ];
  },
};

module.exports = withPlugins(
  [
    withTM,
    withFonts,
    withImages,
    withBundleAnalyzer,
    !isDev ? withSentryConfig : null,
    [withExpo, { projectRoot: __dirname + "/../.." }],
  ].filter(Boolean),
  nextConfig
);
