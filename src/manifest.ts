import packageJson from "../package.json";
import { ManifestType } from "@src/manifest-type";

const manifest: ManifestType = {
  manifest_version: 3,
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  options_page: "src/pages/options/index.html",
  background: { service_worker: "src/pages/background/index.js" },
  action: {
    default_popup: "src/pages/popup/index.html",
    default_icon: "icon-34.png",
  },
  // chrome_url_overrides: {
  //   newtab: "src/pages/newtab/index.html",
  // },
  icons: {
    "16": "logo16.png",
    "32": "logo32.png",
    "48": "logo48.png",
    "128": "logo128.png",
  },
  permissions: ["storage", "tabs", "scripting"],
  host_permissions: [
    "https://music.youtube.com/*",
    "https://ws.audioscrobbler.com/",
    "https://www.last.fm/api/*",
  ],
  content_scripts: [
    {
      matches: ["*://music.youtube.com/*"],
      js: ["src/pages/content/index.js"],
      css: ["assets/css/contentStyle.chunk.css"],
    },
  ],
  devtools_page: "src/pages/devtools/index.html",
  web_accessible_resources: [
    {
      resources: [
        "assets/js/*.js",
        "assets/css/*.css",
        "icon-128.png",
        "icon-34.png",
      ],
      matches: ["*://music.youtube.com/*"],
    },
  ],
};

export default manifest;
