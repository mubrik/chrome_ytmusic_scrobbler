import type { ISong, IMonitor, IRequestObj } from "../../../../content-types";

/**
 * class object holding song details
 */
export class Song implements ISong {
  public track: string;
  public details: string[];
  public artist: string;
  public album: string;
  public year: string;
  public id: string;
  public timers: [number, number];
  public isVideo: boolean;
  public isPaused: boolean;
  /**
   * class object holding song details
   */
  constructor() {
    this.track = this.getCurrentTrackTitle();
    this.details = this.getTrackDetails();
    this.artist = this.details ? this.details[0].trim() : null;
    this.album = this.details ? this.details[1].trim() : null;
    this.year = this.details ? this.details[2].trim() : null;
    this.id = this.getTrackId();
    this.timers = this.getCurrentTrackTime();
    this.isVideo = this.isTrackVideo();
    this.isPaused = this.isTrackPaused();
  }

  /** gets track title from player bar
   * @return Song Title
   * */
  getCurrentTrackTitle(): string {
    const titleElement = document.querySelector<HTMLDivElement>(
      "yt-formatted-string.title.ytmusic-player-bar"
    );
    return titleElement.innerText;
  }

  /** gets track other details from player bar
   * @return Array[string]
   */
  getTrackDetails(): string[] {
    const trackDetailsElem = document.querySelector<HTMLDivElement>(
      "yt-formatted-string.byline.ytmusic-player-bar"
    );
    const detailsList = trackDetailsElem
      ? trackDetailsElem.innerText.split("•")
      : null;
    return detailsList;
  }

  /** gets track id
   * @return {String}
   */
  getTrackId(): string {
    const id = String(this.track + this.artist).replace(/\s/g, "");
    return id;
  }

  /** @return {Array} */
  getCurrentTrackTime(): [number, number] {
    const timeEmt = document
      .querySelector<HTMLDivElement>(".time-info")
      .innerText.split("/");
    const currentTime = timeEmt[0];
    const trackLength = timeEmt[1];

    return [
      this.formatTimeValue(currentTime),
      this.formatTimeValue(trackLength),
    ];
  }

  /** checks if the current song is a video
   * @return {Boolean}
   */
  isTrackVideo(): boolean {
    // check if details are correct
    if (this.details === null) {
      return false;
    }

    if (this.album.includes("views") && this.year.includes("likes")) {
      return true;
    }
    return false;
  }

  /** checks if song paused
   * @return {Boolean}
   */
  isTrackPaused(): boolean {
    const pauseElem =
      document.querySelector<HTMLDivElement>(".play-pause-button");
    if (pauseElem.title === "Play") {
      return true;
    } else {
      return false;
    }
  }

  /**
   * @return {Number} return time in millisec
   * @param {String} str param
   */
  formatTimeValue(str: string): number {
    // split time
    const timeArr = str.split(":");

    if (timeArr.length === 3) {
      // time is in hours

      // convert to int and multiply to get millisec
      const hours = parseInt(timeArr[0]) * 3600000;
      const minutes = parseInt(timeArr[1]) * 60000;
      const seconds = parseInt(timeArr[2]) * 1000;

      return hours + minutes + seconds;
    }

    // convert to int and multiply to get millisec
    const minutes = parseInt(timeArr[0]) * 60000;
    const seconds = parseInt(timeArr[1]) * 1000;

    return minutes + seconds;
  }

  /**
   * some track titles from YTmusic have emojis
   * could come in handy
   * @param {String} param string to format
   * @return {String}
   * */
  removeEmojis(param: string): string {
    // complete later
    const regex = "regex";
    return param.replace(regex, "");
  }
}

/** class handle player events */
export class EventMonitor implements IMonitor {
  public videoElem: HTMLVideoElement;
  public songMonitor: NodeJS.Timer | null;
  public isSongPlaying: boolean;

  /** class handle player events
   * @param {Boolean} init - if the player should log songs
   */
  constructor(init: boolean) {
    this.videoElem = document.querySelector("video");
    this.songMonitor = null;
    this.isSongPlaying = false;
  }

  /** setup event listeners */
  setupListeners() {
    this.videoElem.addEventListener("playing", this.handlePlayEvent.bind(this));
    this.videoElem.addEventListener("pause", this.handlePauseEvent.bind(this));
    this.videoElem.addEventListener(
      "seeked",
      this.handleSeekingEvent.bind(this)
    );
  }

  /** check if to run*/
  /* handleInit() {
    backgroundScriptConnect({type: "contentScript"}, function(result) {
      if (result.msg) {
        this.initiated = true;
      } else {
        this.initiated = false;
      }
    }.bind(this));
  } */

  /** handles track starts playing */
  handlePlayEvent() {
    // check if to progress
    /* if (!this.initiated) {
      this.handleInit();
      return;
    } */
    // check if there's no loop tracker running
    if (this.songMonitor === null) {
      // start loop
      this.loopTracker();
    }
    // update instance
    this.isSongPlaying = true;
  }

  /** handle track paused */
  handlePauseEvent() {
    // update instance
    this.isSongPlaying = false;
  }

  /** handle track seeking */
  handleSeekingEvent() {
    // check if to progress
    /* if (!this.initiated) {
      this.handleInit();
      return;
    } */

    // get song
    const _nowPlaying = new Song();

    const [currentTime] = _nowPlaying.timers;

    // if track was seeked to < 10secs mark
    if (currentTime <= 10000) {
      // if loop tracker isnt started
      if (this.songMonitor === null) {
        this.loopTracker();
      }

      // notify background script
      backgroundScriptConnect({
        type: "trackSeek",
      });
    }
  }

  /** main instance, loop tracker */
  loopTracker() {
    // start loop interval and save ID
    this.songMonitor = setInterval(() => {
      // get song
      const _nowPlaying = new Song();

      // run only if song is playing
      if (_nowPlaying.isPaused) {
        return;
      }
      // check if details are not string return
      if (_nowPlaying.details === null || _nowPlaying.details === undefined) {
        return;
      }

      // send to background
      backgroundScriptConnect({
        type: "playingSong",
        ..._nowPlaying,
      });
    }, 10000);
  }
}

/** connects to background script by sending msg
 * @param {Object} requestObj
 * @param {Function} callback
 */
export const backgroundScriptConnect = (
  requestObj: IRequestObj,
  callback?: () => void
) => {
  chrome.runtime.sendMessage(requestObj, callback);
};

/** wait for a particular query selector */
// function waitForElm(selector: string) {
//   return new Promise((resolve) => {
//     if (document.querySelector(selector)) {
//       return resolve(document.querySelector(selector));
//     }

//     const observer = new MutationObserver(() => {
//       if (document.querySelector(selector)) {
//         resolve(document.querySelector(selector));
//         observer.disconnect();
//       }
//     });

//     observer.observe(document.body, {
//       childList: true,
//       subtree: true,
//     });
//   });
// }

// /** initialize script */
// function init() {
//   const playMonitor = new EventMonitor(true);
//   playMonitor.setupListeners();
// }

// // youtube music player closing
// window.addEventListener("beforeunload", function () {
//   backgroundScriptConnect({ type: "unloading" });
// });

// // wait for video element to be present in DOM before init
// waitForElm("video").then(() => {
//   init();
// });
