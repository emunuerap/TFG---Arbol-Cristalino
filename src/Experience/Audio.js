import { EventEmitter } from "events";
import * as THREE from "three";

export default class AudioController extends EventEmitter {
  constructor() {
    super();

    this.enabled = true;
    this.playingState = false;

    this.listener = new THREE.AudioListener();
    this.audio = new THREE.Audio(this.listener);

    this.audio.setLoop(true);
    this.audio.setVolume(0);

    // Preload audio
    const loader = new THREE.AudioLoader();
    loader.load(
      "/audio/ambient.mp3",
      (buffer) => {
        this.audio.setBuffer(buffer);
        console.log("%cAudio: buffer loaded", "color:#88e");
      },
      undefined,
      (err) => {
        console.error("Audio load error:", err);
        this.enabled = false;
      }
    );
  }

  /* -------------------------------------------- */
  /* BASIC STATE                                   */
  /* -------------------------------------------- */

  playing() {
    return this.playingState;
  }

  volume(v) {
    try {
      this.audio.setVolume(v);
    } catch (e) {
      console.warn("Audio volume error:", e);
    }
  }

  play() {
    if (!this.enabled) return;
    if (this.playingState) return;

    try {
      this.audio.play();
      this.playingState = true;
      this.trigger("play");
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  stop() {
    if (!this.enabled) return;
    if (!this.playingState) return;

    try {
      this.audio.stop();
      this.playingState = false;
      this.trigger("stop");
    } catch (e) {
      console.warn("Audio stop error:", e);
    }
  }
}
