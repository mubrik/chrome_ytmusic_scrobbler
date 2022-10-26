/**
 * Song type
 */
export interface ISong {
  track: string;
  details: string[];
  artist: string | null;
  album: string | null;
  year: string | null;
  id: string | null;
  timers: [number, number];
  isVideo: boolean;
  isPaused: boolean;
}

/**
 * Event Monitor type
 */
export interface IMonitor {
  videoElem: HTMLVideoElement;
  songMonitor: NodeJS.Timer | null;
  isSongPlaying: boolean;
}

export interface IBackgroundStore {
  session: string | null;
  token: string | null;
  username: string | null;
  nowPlaying: {
    id: string | null;
    track: string | null;
    artist: string | null;
    isScrobbled: boolean;
    isPlayingOnLastfm: boolean;
    timers: [number, number];
    userPlayCount: string | null;
    userLoved: boolean;
  };
  scrobbleEnabled: boolean;
  scrobbleAt: "half" | "end";
  errors: string | null;
  isScrobblerInstalled?: boolean;
}

export interface ILastfmKeys {
  apiKey: string;
  apiSecret: string;
}

export interface ILFMAuthReqData {
  api_key: string;
  method: string;
  sk?: string;
  timestamp?: number | string;
  artist?: string;
  track?: string;
  format?: string;
}

export interface ILFMReqData extends Record<string, string | number> {
  api_key: string;
  method: string;
  username?: string;
  timestamp?: number;
  artist?: string;
  track?: string;
  format?: string;
}

export interface ISignedLFMAuthReqData extends Record<string, string> {
  api_key: string;
  method: string;
  api_sig: string;
  format: "json";
}

export interface ILastFMParams<T extends ISignedLFMAuthReqData | ILFMReqData> {
  reqMethod: "GET" | "POST";
  body: T;
}

interface IRequestSuccessResponse<T> {
  ok: true;
  response: T;
}

interface IRequestErrorResponse {
  ok: false;
  error: string;
}

export type IRequestResponse<T> =
  | IRequestSuccessResponse<T>
  | IRequestErrorResponse;

/**
 * Request type
 */
type RequestType =
  | "playingSong"
  | "trackSeek"
  | "getTrackInfo"
  | "unloading"
  | "updateLove"
  | "userProfile"
  | "authUser"
  | "contentScript"
  | "extensionScript"
  | "saveToken"
  | "scrobbleEnabled"
  | "scrobbleAt"
  | "setScrobble"
  | "saveSession";

export interface IRequestType<T> {
  type: T;
}

/**
 * For content script
 */
export interface IContentRequestObj extends ISong {
  type: Extract<RequestType, "playingSong">;
}

export interface ICreateTabRequestObj {
  type: Extract<RequestType, "userProfile" | "authUser">;
  url: string;
}

export interface ISaveTokenRequestObj {
  type: Extract<RequestType, "saveToken">;
  token: string;
}

export interface ISaveSessionRequestObj {
  type: Extract<RequestType, "saveSession">;
  session: {
    key: string;
    name: string;
    subscriber: string;
  };
}

export interface IUpdateValueRequestObj {
  type: Extract<RequestType, "scrobbleAt" | "scrobbleEnabled">;
  value: string;
}

export interface IUpdateScrobbleRequestObj {
  type: Extract<RequestType, "setScrobble">;
  scrobbleAt: "half" | "end";
  scrobbleEnabled: boolean;
}

export type IRequestObj =
  | IRequestType<
      Exclude<
        RequestType,
        | "playingSong"
        | "userProfile"
        | "authUser"
        | "saveToken"
        | "scrobbleAt"
        | "scrobbleEnabled"
        | "saveSession"
        | "setScrobble"
      >
    >
  | IContentRequestObj
  | ISaveTokenRequestObj
  | ICreateTabRequestObj
  | ISaveSessionRequestObj
  | IUpdateScrobbleRequestObj;
