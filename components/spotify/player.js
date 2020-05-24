import CustomElement from '../custom-element.js';
import { loaded } from '../../js/std-js/functions.js';

const SPOTIFY = 'https://open.spotify.com/embed/';
const TYPES = [
	'track',
	'album',
	'playlist',
	'artist',
];

customElements.define('spotify-player', class HTMLSpotifyTrackElement extends CustomElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		this.getTemplate('./components/spotify/player.html').then(tmp => {
			this.shadowRoot.append(tmp.cloneNode(true));
			this.dispatchEvent(new Event('ready'));
		});
	}

	get large() {
		return this.hasAttribute('large');
	}

	set large(val) {
		this.toggleAttribute('large', val);
	}

	get uri() {
		return this.getAttribute('uri');
	}

	set uri(val) {
		if (typeof val === 'string' && val !== '') {
			this.setAttribute('uri', val);
		} else {
			this.removeAttribute('uri');
		}
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
		case 'large':
			this.ready.then(() => {
				const size = newValue === null ? 80 : 380;
				const slot = this.shadowRoot.querySelector('slot[name="player"]');
				slot.assignedNodes().forEach(el => el.height = size);
			});
			break;

		case 'uri':
			this.ready.then(async () => {
				const slot = this.shadowRoot.querySelector('slot[name="player"]');

				if (typeof newValue === 'string' && newValue.startsWith('spotify:')) {
					const [, type = '', id = ''] = newValue.split(':');
					if (! TYPES.includes(type)) {
						throw new Error(`Unsupported type: ${type}`);
					} else if (! /^[A-z\d]{22}$/.test(id)) {
						throw new Error(`Invalid Spotify ID ${id}`);
					}

					const iframe = document.createElement('iframe');
					iframe.height = this.large ? 380 : 80;
					iframe.width = 300;
					iframe.slot = 'player';
					iframe.setAttribute('allowtransparency', 'true');
					iframe.allow = 'encrypted-media';
					iframe.referrerPolicy = 'origin';
					iframe.loading = 'lazy';

					if ('sandbox' in iframe) {
						iframe.sandbox.add('allow-scripts', 'allow-popups', 'allow-same-origin');
					}

					iframe.addEventListener('load', async () => {
						this.dispatchEvent(new CustomEvent('trackchange', {detail: {
							from: oldValue,
							to: newValue,
						}}));
					}, {once: true});

					iframe.addEventListener('error', console.error, {once: true});

					iframe.src = new URL(`${type}/${id}`, SPOTIFY);
					await loaded();
					slot.assignedNodes().forEach(el => el.remove());
					this.append(iframe);
				} else {
					slot.assignedNodes.forEach(el => el.remove());
				}
			});
			break;

		default:
			throw new Error(`Unknown attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'uri',
			'large',
		];
	}
});
