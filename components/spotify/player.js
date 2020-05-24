import CustomElement from '../custom-element.js';
import { loaded } from '../../js/std-js/functions.js';

const SPOTIFY = 'https://open.spotify.com/embed/';
const TYPES = [
	'track',
	'album',
	'playlist',
	'artist',
];

function createPlayer(large = null) {
	const iframe = document.createElement('iframe');
	iframe.height = large === true ? 380 : 80;
	iframe.width = 300;
	iframe.setAttribute('allowtransparency', 'true');
	iframe.allow = 'encrypted-media';
	iframe.referrerPolicy = 'origin';
	iframe.loading = 'lazy';

	if ('sandbox' in iframe) {
		iframe.sandbox.add('allow-scripts', 'allow-popups', 'allow-same-origin');
	}

	return iframe;
}

function parseURI(uri) {
	if (typeof uri !== 'string') {
		throw new Error('URI is not a string');
	} else if (! uri.startsWith('spotify:')) {
		throw new Error('URI is not a valid Spotify URI');
	} else {
		const [, type = '', id = ''] = uri.split(':');
		if (! TYPES.includes(type)) {
			throw new Error(`Unsupported type: ${type}`);
		} else if (! /^[A-z\d]{22}$/.test(id)) {
			throw new Error(`Invalid Spotify ID ${id}`);
		} else {
			return {type, id};
		}
	}
}

customElements.define('spotify-player', class HTMLSpotifyTrackElement extends CustomElement {
	constructor(uri = null, large = null) {
		super();
		this.attachShadow({mode: 'open'});

		this.getTemplate('./components/spotify/player.html').then(tmp => {
			this.shadowRoot.append(tmp.cloneNode(true));
			this.dispatchEvent(new Event('ready'));
		});

		if (typeof uri === 'string') {
			this.uri = uri;
		}

		if (typeof large === 'boolean') {
			this.large = large;
		}
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
			this.ready.then(async () => {
				const size = newValue === null ? 80 : 380;
				const nodes = await this.getSlotted('player');
				nodes.forEach(el => el.height = size);
			});
			break;

		case 'uri':
			this.ready.then(async () => {
				if (typeof newValue === 'string' && newValue.startsWith('spotify:')) {
					const {type, id} = parseURI(newValue);

					const iframe = createPlayer(this.large);

					iframe.addEventListener('load', async () => {
						this.dispatchEvent(new CustomEvent('trackchange', {detail: {
							from: oldValue,
							to: newValue,
						}}));
					}, {once: true});

					iframe.addEventListener('error', console.error, {once: true});

					iframe.src = new URL(`${type}/${id}`, SPOTIFY).href;

					await loaded();
					this.setSlot('player', iframe);
				} else {
					this.clearSlot('player');
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
