import React, { useEffect, useState } from "react";
import logo from "@assets/img/logo.svg";
import loveImg from "@assets/img/love.svg";
import unloveImg from "@assets/img/love1.svg";
import "@pages/popup/Popup.css";
/* type */
import type { IBackgroundStore } from "@src/content-types";

interface IAppProps {
  store: IBackgroundStore;
}
const Popup = ({ store }: IAppProps) => {
  const [viewState, setViewState] = useState(0);

  useEffect(() => {
    console.log("useeffect stroe", store);
  }, [store]);

  return (
    <div className="App">
      <PopHeader store={store} />
      <div className="Tab">
        <button
          className={`Tab-button ${viewState === 0 ? "active" : ""}`}
          onClick={() => setViewState(0)}
        >
          Now Playing
        </button>
        <button
          className={`Tab-button ${viewState === 1 ? "active" : ""}`}
          onClick={() => setViewState(1)}
        >
          Settings
        </button>
      </div>
      {viewState === 0 ? (
        <PopNowPlaying store={store} />
      ) : (
        <PopSettings store={store} />
      )}
    </div>
  );
};

const PopHeader = ({ store }: IAppProps) => {
  return (
    <div className="Pop-Header">
      <p className={store.session ? "active" : "warn"}>
        {store.username ? "Connected to LastFM" : "Connect to LastFM"}
      </p>
      <p> Welcome {store.username ? store.username : "Anon"} </p>
    </div>
  );
};

const PopNowPlaying = ({ store }: IAppProps) => {
  return (
    <div className="flex-content now-playing">
      {store.nowPlaying.id ? (
        <>
          <p>Now playing:</p>
          <p className="song-title">{store.nowPlaying.track}</p>
          <p className="song-artist">{store.nowPlaying.artist}</p>
          <p className="song-scrobbles">{store.nowPlaying.userPlayCount}</p>
          <div id="song-loveBtn">
            <img
              src={store.nowPlaying.userLoved ? loveImg : unloveImg}
              id="loveBtn"
            />
          </div>
        </>
      ) : (
        <>
          <p> No Track playing</p>
        </>
      )}
    </div>
  );
};

const PopSettings = ({ store }: IAppProps) => {
  // state
  const [enableScrobble, setEnableScrobble] = useState(store.scrobbleEnabled);
  const [scrobbleLength, setScrobbleLength] = useState(store.scrobbleAt);

  const handleMsg = (param: Record<string, string | boolean>) => {
    chrome.runtime.sendMessage(param);
  };

  return (
    <div className="flex-content settings">
      <label htmlFor="scrobble">
        Enable scrobble:
        <input
          type="checkbox"
          name="scrobble"
          id="scrobble-toggle"
          value="scrobble"
          defaultChecked={enableScrobble}
          onChange={() => setEnableScrobble((prev) => !prev)}
        />
      </label>
      <label>
        Scrobble at:
        <select
          name="scrobble-length"
          id="scrobble-length"
          defaultValue={scrobbleLength}
          onChange={(e) => setScrobbleLength(e.target.value as "half" | "end")}
        >
          <option value="half"> Halfway </option>
          <option value="end"> 90% </option>
        </select>
      </label>
      <button
        id="saveBtn"
        onClick={() => {
          handleMsg({
            type: "setScrobble",
            scrobbleAt: scrobbleLength,
            scrobbleEnabled: enableScrobble,
          });
        }}
      >
        Save
      </button>
      <button
        id="connectBtn"
        onClick={() => {
          handleMsg({ type: "authUser" });
        }}
      >
        Connect to LastFm
      </button>
    </div>
  );
};

export default Popup;
