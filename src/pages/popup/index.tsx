import React from "react";
import { createRoot } from "react-dom/client";
import "@pages/popup/index.css";
import Popup from "@pages/popup/Popup";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
/* type */
import type { IBackgroundStore } from "@src/content-types";

refreshOnUpdate("pages/popup");

function init(store: IBackgroundStore) {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find AppContainer");
  }
  const root = createRoot(appContainer);
  root.render(<Popup store={store} />);
}

function getBackgroundCacheAndInit() {
  chrome.runtime.sendMessage(
    { type: "extensionScript" },
    (param: IBackgroundStore) => {
      init(param);
    }
  );
}

getBackgroundCacheAndInit();
