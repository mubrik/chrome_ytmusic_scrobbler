/* contains util functions for background script */
import { lastfm } from "./keys";
import { md5 } from "./md5";
import { utf8 } from "./utf8";
/* type */
import type {
  IBackgroundStore,
  ILFMAuthReqData,
  ISignedLFMAuthReqData,
  ILastFMParams,
  ILFMReqData,
  ISong,
  IRequestResponse,
} from "@src/content-types";

/* The local cache */
export const backgroundStore: IBackgroundStore = {
  session: null,
  token: null,
  username: null,
  nowPlaying: {
    id: null,
    artist: null,
    track: null,
    isScrobbled: false,
    isPlayingOnLastfm: false,
    timers: [0, 0],
    userLoved: false,
    userPlayCount: null,
  },
  scrobbleEnabled: true,
  scrobbleAt: "half",
  errors: null,
};

/** gets all sync storage data
 * @return {Promise}
 */
function getAllStorageSyncData(): Promise<
  Record<string, string | boolean | null>
> {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.sync.get(null, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
}

/** stores all sync storage data to local backgroundStore cache */
export function getStorageDataToLocalStore(param: IBackgroundStore): void {
  // Copy the data retrieved from storage into storageCache.
  getAllStorageSyncData().then((items) => {
    Object.assign(param, items);
  });
}

// call this on every run to fetch sync storage to storagecache
getStorageDataToLocalStore(backgroundStore);

chrome.runtime.onInstalled.addListener(
  // run on first install or update
  function () {
    // set variables to be used as null if not set/valid or hasnt been installed
    getAllStorageSyncData()
      .then((items) => {
        Object.assign(lastfm, items);
      })
      .finally(() => {
        if (backgroundStore.isScrobblerInstalled === undefined) {
          // set variables
          chrome.storage.sync.set({
            isScrobblerInstalled: true,
            session: null,
            token: null,
            username: null,
            nowPlaying: {
              id: null,
              isScrobbled: false,
              isPlayingOnLastfm: false,
            },
            scrobbleEnabled: true,
            scrobbleAt: "half",
            errors: null,
          });
          // store variables in storagecache
          getStorageDataToLocalStore(backgroundStore);
        }
      });
  }
);

/** saves a an item to storage sync and
 * calls storeStorageDataToLocalStore to update storagecache
 */
export function saveToStorageSync(
  storeParam: Partial<IBackgroundStore>,
  callback?: () => void
): void {
  // stores item to sync storage
  // callback to storage cache

  // const _storeId = String(idParam);
  // const _storeItem = storeParam;
  const _callback =
    callback ||
    function () {
      // after every storage update, call this to update instance storageCache
      getStorageDataToLocalStore(backgroundStore);
    };

  // store item
  chrome.storage.sync.set(
    {
      ...storeParam,
    },
    _callback
  );
}

/**
 * for making signed lastfm calls, creates md5 signature from given object
 * insert a api_sig sey and format=json for lastfm response
 */
export function getLastFmSignedData(
  param: ILFMAuthReqData
): ISignedLFMAuthReqData {
  // variables
  let str_to_sign = "";

  // make string from sorted keys and value as per lastfm requirement
  const sortedKeys = Object.keys(param).sort();
  sortedKeys.forEach((item) => {
    // add key and values to string
    // change timestamp (or all?) to string
    if (item === "timestamp") {
      str_to_sign += item + utf8.utf8encode(String(param[item]));
      return;
    }
    str_to_sign += item + utf8.utf8encode(param[item]);
  });

  // secret should always be last, lastfm requirement
  str_to_sign += lastfm.apiSecret;
  // get md5 and sign string
  const _md5 = md5(str_to_sign);
  // retrun obj
  const returnObj = {
    ...param,
    api_sig: _md5,
    format: "json",
  };

  // if (sortedKeys.includes("timestamp")) {
  //   returnObj["timestamp"] = String(param.timestamp);
  // }

  // add signature and response format after
  return returnObj as ISignedLFMAuthReqData;
}

/**
 * makes authenticated/signed call request to lastfm
 */
export async function makeAuthenticatedReq<T>(
  param: ILastFMParams<ISignedLFMAuthReqData>
): Promise<IRequestResponse<T>> {
  const { reqMethod, body } = param;
  // parameters
  const _method = reqMethod || "POST";
  // const lastfmMethod = body.method;

  // get signed datat
  // IMPORTNAT, MOVE OUTSIDE FUNCTION
  // const signedData = getLastFmSignedData({ ...body });
  // create urlencoded param for body
  const data = new URLSearchParams(body);

  // make request
  const myReq = new Request("https://ws.audioscrobbler.com/2.0/", {
    method: _method,
    body: data,
  });

  try {
    const response = await fetch(myReq);
    console.log(response);
    if (response.ok) {
      const result: T = await response.json();
      return {
        ok: true,
        response: result,
      };
    } else {
      // handle error, should implement retry logic
      const result: Record<"error", number> = await response.json();
      console.log("err", result);
      const _errMsg =
        result["error"] === 9
          ? "Invalid session key - Please re-authenticate"
          : "Error occured";
      // save error to cache
      saveToStorageSync({ errors: _errMsg });
      return {
        ok: false,
        error: _errMsg,
      };
    }
  } catch (error) {
    // net disconnect, fail gracefully
    return {
      ok: false,
      error: "Network Error",
    };
  }
}

/**
 * makes GET or unauth calls to lastfm
 */
export async function makeUnAuthenticatedReq<T>(
  param: ILastFMParams<ILFMReqData>
): Promise<IRequestResponse<T>> {
  const { reqMethod, body } = param;
  // parameters mostlikely get
  const _method = reqMethod || "GET";
  // const _body = bodyData;

  // create urlencoded param for body
  const data = new URLSearchParams(body as Record<string, string>);

  // fetch request
  try {
    const response = await fetch(
      "https://ws.audioscrobbler.com/2.0/?" + data.toString(),
      {
        method: _method,
      }
    );
    console.log(response);
    if (response.ok) {
      const result: T = await response.json();
      return {
        ok: true,
        response: result,
      };
    } else {
      // handle error, should implement retry after moving logic to bg script
      const result = await response.text();
      console.log("err", result);
      return {
        ok: false,
        error: result,
      };
    }
  } catch (error) {
    // unreachable, fail gracefully do something
    return {
      ok: false,
      error: "Network Error",
    };
  }
}

/**
 * prepares scrobble data and makes request to lastfm to scrobble track
 */
export async function scrobbleTrackToLastFm(song: ISong): Promise<boolean> {
  // get current time in ms
  const utcTime = Date.now();
  // subtrack elapsed track time
  const timestamp = utcTime - song.timers[0];
  // convert to seconds
  const timestampSec = Math.floor(timestamp / 1000);
  // lastfm request body data
  const bodyData = {
    timestamp: timestampSec,
    artist: song.artist,
    track: song.track,
    api_key: lastfm.apiKey,
    sk: backgroundStore.session,
    method: "track.scrobble",
  };
  // make auth call
  if (backgroundStore.scrobbleEnabled) {
    // get signed data
    const signedBodyData = getLastFmSignedData(bodyData);
    console.log("scrobblingsigned data", signedBodyData);
    // request
    const result = await makeAuthenticatedReq({
      reqMethod: "POST",
      body: signedBodyData,
    });

    if (result.ok) {
      // save to sync, clear error if any exixt
      saveToStorageSync({
        nowPlaying: {
          ...backgroundStore.nowPlaying,
          timers: song.timers,
          isScrobbled: true,
        },
        errors: null,
      });
      return true;
    }

    return false;
  }
}

/**
 * prepares track nowplaying data and makes request to update lastfm nowplaying
 */
export async function updateNowPlayingToLastfm(song: ISong): Promise<boolean> {
  // lastfm request body data
  const bodyData = {
    artist: song.artist,
    track: song.track,
    api_key: lastfm.apiKey,
    sk: backgroundStore.session,
    method: "track.updateNowPlaying",
  };
  // make auth call
  // get signed data
  const signedBodyData = getLastFmSignedData(bodyData);
  console.log("update no playing signed data", signedBodyData);
  // request
  const result = await makeAuthenticatedReq({
    reqMethod: "POST",
    body: signedBodyData,
  });

  if (result.ok) {
    // save to sync, clear error if any exixt
    saveToStorageSync({
      nowPlaying: {
        ...backgroundStore.nowPlaying,
        timers: song.timers,
        isPlayingOnLastfm: true,
      },
      errors: null,
    });
    return true;
  }

  return false;
}

/**
 * gets user track data from last fm, saves to nowplaying
 */
export async function updateStoreLastfmTrackDetail(
  song: ISong
): Promise<boolean> {
  // verify
  if (backgroundStore.username === null) return false;
  // body data
  const bodyData = {
    artist: song.artist,
    track: song.track,
    api_key: lastfm.apiKey,
    username: backgroundStore.username,
    method: "track.getInfo",
    format: "json",
  };

  // make request, get no need for signing data
  const result = await makeUnAuthenticatedReq<Record<"track", unknown>>({
    reqMethod: "GET",
    body: bodyData,
  });

  if (result.ok) {
    const _track = result.response["track"] as Record<string, string>;
    if (_track) {
      saveToStorageSync({
        nowPlaying: {
          ...backgroundStore.nowPlaying,
          artist: song.artist,
          track: song.track,
          userPlayCount: _track["userplaycount"],
          userLoved: _track["userloved"] == "0" ? false : true,
        },
      });
    }
  }
}

/* gets last fm token for user to authorize */
export async function getLastfmToken(): Promise<string | undefined> {
  const bodyData = {
    method: "auth.gettoken",
    api_key: lastfm.apiKey,
    format: "json",
  };

  const result = await makeUnAuthenticatedReq<Record<"token", string>>({
    reqMethod: "GET",
    body: bodyData,
  });

  if (result.ok) {
    const token = result.response.token;

    /* save token */
    saveToStorageSync({ token: token });

    /* return */
    return token;
  }
}

/**
 * check if current song has reached time to scrobble
 */
export function isSongAtScrobbleTime(song: ISong) {
  // get timers from obj
  const [current, duration] = song.timers;

  if (duration <= 30000) {
    // if track is less than 30s, false so never scrobbles
    return false;
  }

  if (backgroundStore.scrobbleAt === "end") {
    // get 90% duration of track
    const timer = duration * 0.9;
    return current >= timer;
  }

  const timer = duration / 2;
  return current >= timer;
}

/**
 * listener for user authorization, injects script in page
 */
export function lastfmListener(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) {
  if (tab.url.match("last.fm/api/auth?")) {
    // match if user navigates to auth page
    console.log("page match");

    if (changeInfo.status === "complete") {
      // insert script after loading complete to prevent dupes
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            console.log("callback insterted");
            // return the title and url of auth page
            return {
              title: window.document.title,
              url: window.document.location.href,
            };
          },
        },
        (injectionResults) => {
          // send return value to process
          for (const frameResult of injectionResults) {
            processUserAuth(frameResult);
          }
        }
      );
    }
    /* chrome.tabs.onUpdated.removeListener(myListener); */
    return;
  }
}

interface IFrameResult {
  result: {
    title: string;
    url: string;
  };
}
/**
 *works on data received from script injected into last.fm/api/auth? by listener
 */
async function processUserAuth({ result }: IFrameResult) {
  const { title, url } = result;

  if (
    title.includes("Application authenticated") &&
    url.includes(lastfm.apiKey)
  ) {
    // if user authenticated our token, get a session key
    // data to be used
    const bodyData = {
      method: "auth.getSession",
      api_key: lastfm.apiKey,
      token: backgroundStore.token,
    };
    console.log("getting session key");
    // lastfm method requires signature
    const signedData = getLastFmSignedData(bodyData);
    console.log("signed data", signedData);

    // get the session key
    const response = await makeUnAuthenticatedReq<Record<"session", unknown>>({
      reqMethod: "GET",
      body: signedData,
    });

    console.log("response", response);

    // error check
    if (response.ok) {
      const { session } = response.response;
      // store the session keys in sync storage
      chrome.storage.sync.set({
        session: session["key"],
        username: session["name"],
        subscriber: session["subscriber"],
      });
      // store in cache storage
      getStorageDataToLocalStore(backgroundStore);

      // remove listener
      chrome.tabs.onUpdated.removeListener(lastfmListener);
    }
  } else if (
    title.includes("onnect application") &&
    url.includes(lastfm.apiKey)
  ) {
    // do something
  }
}

export { lastfm };
