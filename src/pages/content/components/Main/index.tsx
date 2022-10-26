import { createRoot } from "react-dom/client";
import App from "@src/pages/content/components/Main/app";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import { EventMonitor, backgroundScriptConnect } from "./classes";

refreshOnUpdate("pages/content/components/Main");

/* script */

/** wait for a particular query selector */
function waitForElm(selector: string) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

/** initialize script */
function init() {
  console.log("content script init");
  const playMonitor = new EventMonitor(true);
  playMonitor.setupListeners();
}

// youtube music player closing
window.addEventListener("beforeunload", function () {
  backgroundScriptConnect({ type: "unloading" });
});

// wait for video element to be present in DOM before init
waitForElm("video").then(() => {
  init();
});

/* to render on content page */
const root = document.createElement("div");
root.id = "chrome-lastfm-scrobbler-extension";
document.body.append(root);

createRoot(root).render(<App />);
