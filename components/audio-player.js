/* global MediaMetadata */
import { registerCustomElement } from '../js/std-js/custom-elements.js';

/**
 * Adds `navigator.mediaSession` functionality to native `<audio>` elements
 * @SEE https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/
 */
registerCustomElement('audio-player', class HTMLAudioPlayerElement extends HTMLAudioElement {
	constructor({
		title    = null,
		artist   = null,
		album    = null,
		duration = null,
		artwork  = null,
	} = {}) {
		super();

		Promise.resolve().then(() => {
			if (typeof title === 'string') {
				this.title = title;
			}

			if (typeof artist === 'string') {
				this.artist = artist;
			}

			if (typeof album === 'string') {
				this.album = album;
			}

			if (Array.isArray(artwork)) {
				this.artwork = artwork;
			}

			if (Number.isInteger(duration)) {
				this.duration = duration;
			}
		});

		if ('mediaSession' in navigator) {
			let playHandle = null;

			const play = () => {
				navigator.mediaSession.metadata = this.metadata;

				if (typeof playHandle !== 'number') {
					playHandle = setInterval(() => {
						navigator.mediaSession.setPositionState(this.playbackState);
					}, 1000);
				}
			};

			const pause = () => {
				if (typeof playHandle === 'number') {
					clearInterval(playHandle);
					playHandle = null;
				}
			};

			navigator.mediaSession.setActionHandler('play', () => this.play());
			navigator.mediaSession.setActionHandler('pause', () => this.pause());

			navigator.mediaSession.setActionHandler('seekforward', () => {
				if (this.fastSeek instanceof Function) {
					this.fastSeek(Math.min(this.currentTime + this.seekStep, this.duration));
				} else {
					this.currentTime = Math.min(this.currentTime + this.seekStep, this.duration);
				}
			});

			navigator.mediaSession.setActionHandler('seekbackward', () => {
				if (this.fastSeek instanceof Function) {
					this.fastSeek(Math.max(this.currentTime - this.seekStep, 0));
				} else {
					this.currentTime = Math.max(this.currentTime - this.seekStep, 0);
				}
			});

			// navigator.mediaSession.setActionHandler('seekto', console.info);
			navigator.mediaSession.setActionHandler('nexttrack', null);

			navigator.mediaSession.setActionHandler('previoustrack', null);

			navigator.mediaSession.setActionHandler('stop', () => {
				this.pause();
				this.currentTime = 0;
			});
			// navigator.mediaSession.setActionHandler('skipad', null);

			this.addEventListener('play', () => {
				play();
				navigator.mediaSession.playbackState = 'playing';
			}, {
				passive: true,
			});

			this.addEventListener('pause', () => {
				pause();
				navigator.mediaSession.playbackState = 'paused';
			}, {
				passive: true,
			});

			if (this.paused) {
				navigator.mediaSession.playbackState = 'paused';
			} else {
				play();
				navigator.mediaSession.playbackState = 'playing';
			}
		}
	}

	get artist() {
		return this.getAttribute('artist');
	}

	set artist(val) {
		if (typeof val === 'string') {
			this.setAttribute('artist', val);
		} else {
			this.removeAttribut('artist');
		}
	}

	get artwork() {
		if (this.hasAttribute('artwork')) {
			return this.getAttribute('artwork').split(',')
				.map(seg => {
					const [src, sizes, type] = seg.trim().split(' ');
					return { src, sizes, type };
				}).filter(({ src }) => typeof src !== 'undefined');
		} else {
			return [];
		}
	}

	set artwork(val) {
		if (Array.isArray(val)) {
			const art = val.map(({ src, sizes, type}) => `${src} ${sizes} ${type}`);
			this.setAttribute('artwork', art.join(','));
		} else {
			this.removeAttribute('artwork');
		}
	}

	get album() {
		return this.getAttribute('album');
	}

	set album(val) {
		if (typeof val === 'string') {
			this.setAttribute('album', val);
		} else {
			this.removeAttribut('album');
		}
	}

	get duration() {
		return parseInt(this.getAttribute('duration')) || Infinity;
	}

	set duration(val) {
		if (Number.isInteger(val)) {
			this.setAttribute('duration', val);
		} else {
			this.removeAttribut('duration');
		}
	}

	get playbackState() {
		return {
			duration: this.duration,
			position: this.currentTime,
			playbackRate: this.playbackRate,
		};
	}

	set playbackState({ duration = NaN, position = NaN, playbackRate = NaN} = {}) {
		if (typeof duration === 'number' && duration > 0) {
			this.duration = duration;
		}

		if (typeof postion === 'number' && position >= 0) {
			this.fastSeek(position);
		}

		if (typeof playbackRate === 'number' && playbackRate > 0) {
			this.playbackRate = playbackRate;
		}

		if ('mediaSession' in navigator) {
			navigator.mediaSession.setPlaybackState(this.playbackState);
		}
	}

	get metadata() {
		const { title, artist, album, artwork } = this;
		if ('MediaMetadata' in window) {
			return new MediaMetadata({ title, artist, album, artwork });
		} else {
			return { title, artist, album, artwork };
		}
	}

	set metadata({ title = null, artist = null, album = null, artwork = null} = {}) {
		if (typeof title === 'string') {
			this.title = title;
		}

		if (typeof artist === 'string') {
			this.artist = artist;
		}

		if (typeof album === 'string') {
			this.album = album;
		}

		if (Array.isArray(artwork)) {
			this.artwork = artwork;
		}
	}

	get seekStep() {
		return parseInt(this.getAttribute('seekstep')) || 10;
	}

	attributeChangedCallback(name) {
		switch(name) {
			case 'title':
			case 'artist':
			case 'album':
			case 'artwork':
				if ('mediaSession' in navigator) {
					navigator.mediaSession.metadata = this.metadata;
				}
				break;

			case 'duration':
				if (('mediaSession' in navigator) && navigator.mediaSession.setPlaybackState instanceof Function) {
					navigator.mediaSession.setPlaybackState(this.playbackState);
				}
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'title',
			'artist',
			'album',
			'artwork',
			'duration',
		];
	}
}, {
	extends: 'audio',
});
