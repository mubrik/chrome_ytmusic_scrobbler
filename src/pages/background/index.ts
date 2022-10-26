import reloadOnUpdate from "virtual:reload-on-update-in-background-script";

reloadOnUpdate("pages/background");

console.log("background starting");

import {
  backgroundStore,
  saveToStorageSync,
  makeAuthenticatedReq,
  getLastFmSignedData,
  lastfm,
  updateStoreLastfmTrackDetail,
  updateNowPlayingToLastfm,
  scrobbleTrackToLastFm,
  getLastfmToken,
  isSongAtScrobbleTime,
  lastfmListener,
} from "./utils";
/* type */
import type { IRequestObj, ISong } from "@src/content-types";

/* background messages func handler */
function requestListener(
  request: IRequestObj,
  sender: chrome.runtime.MessageSender,
  sendResponse: (param?: unknown) => void
) {
  switch (request.type) {
    case "extensionScript": {
      // extension scripts requesting variables
      sendResponse({
        msg: true,
        ...backgroundStore,
      });
      break;
    }

    case "contentScript": {
      // checks if content script should run
      sendResponse({
        msg: backgroundStore.session && backgroundStore.token ? true : false,
        ...backgroundStore,
      });
      break;
    }

    case "authUser": {
      getLastfmToken().then((result) => {
        if (result) {
          // creates the auth tab
          chrome.tabs.create({
            active: true,
            url: `http://www.last.fm/api/auth/?api_key=${lastfm.apiKey}&token=${result}`,
          });
        } else {
          // create an error page
        }
      });
      break;
    }

    case "userProfile": {
      // creates the auth tab
      chrome.tabs.create({
        active: true,
        url: request.url,
      });

      break;
    }

    case "setScrobble": {
      console.log("scrob sett", request);
      saveToStorageSync({
        scrobbleAt: request.scrobbleAt,
        scrobbleEnabled: request.scrobbleEnabled,
      });
      break;
    }

    case "saveSession": {
      // ext script saving session
      chrome.storage.sync.set({
        session: request.session["key"],
        username: request.session["name"],
        subscriber: request.session["subscriber"],
      });
      break;
    }

    case "unloading": {
      // when youtube music is closing, clean up
      saveToStorageSync({
        nowPlaying: {
          ...backgroundStore.nowPlaying,
          id: null,
          isScrobbled: null,
          isPlayingOnLastfm: false,
        },
      });
      break;
    }

    case "trackSeek": {
      saveToStorageSync({
        nowPlaying: {
          ...backgroundStore.nowPlaying,
          id: null,
          isScrobbled: false,
          isPlayingOnLastfm: false,
        },
      });
      break;
    }

    case "playingSong": {
      // while song playing
      if (request.artist && request.track) {
        console.log("playing songs req", request);
        // params
        const trackData = {
          id: request.id,
          artist: request.artist,
          track: request.track,
          timers: request.timers,
          isVideo: request.isVideo,
        };
        // update track locally
        if (!(trackData.id === backgroundStore.nowPlaying.id)) {
          console.log("Background store before save sync", backgroundStore);
          // update local, then update store
          saveToStorageSync({
            nowPlaying: {
              ...trackData,
              isScrobbled: false,
              isPlayingOnLastfm: false,
              userLoved: false,
              userPlayCount: "0",
            },
          });
          // get user details about track and update
          console.log("Background store after save sync ", backgroundStore);
          updateStoreLastfmTrackDetail(trackData as ISong);
          console.log("Background store after update lastfm", backgroundStore);
        }
        // lastfm requests wont work without sessions
        if (backgroundStore.session === null) {
          console.log("session is null");
          return;
        }
        // update lastfm to notify track now playingSong
        if (
          backgroundStore.nowPlaying.id !== null &&
          !backgroundStore.nowPlaying.isPlayingOnLastfm
        ) {
          // not same track, and hasnt been updated on lastfm
          updateNowPlayingToLastfm(trackData as ISong);
        }
        // scrobble
        // check timers
        if (
          isSongAtScrobbleTime(trackData as ISong) &&
          !backgroundStore.nowPlaying.isScrobbled
        ) {
          // scrobble, checks for settings implemented
          scrobbleTrackToLastFm(trackData as ISong);
        }
      }
      break;
    }

    case "updateLove": {
      // check current storage for love status
      const isLove = backgroundStore.nowPlaying.userLoved
        ? "track.unlove"
        : "track.love";
      // lastfm request body data
      const bodyData = {
        artist: backgroundStore.nowPlaying.artist,
        track: backgroundStore.nowPlaying.track,
        api_key: lastfm.apiKey,
        sk: backgroundStore.session,
        method: isLove,
      };
      // sign body data
      const signedData = getLastFmSignedData(bodyData);
      // make req based on check
      makeAuthenticatedReq({ reqMethod: "POST", body: signedData });

      // update sync storage
      saveToStorageSync({
        nowPlaying: {
          ...backgroundStore.nowPlaying,
          userLoved: !backgroundStore.nowPlaying.userLoved,
        },
      });
      // callback
      sendResponse({ msg: true, status: isLove });

      break;
    }

    default:
      break;
  }
}

// loads all scripts required for background.js to work
/** listener for lastfmauth */
chrome.tabs.onUpdated.addListener(lastfmListener);

chrome.runtime.onMessage.addListener(requestListener);

console.log(backgroundStore);
console.log("background loaded");
