import CustomElement from '../custom-element.js';
import { loaded } from '../../js/std-js/functions.js';

const SPOTIFY = 'https://open.spotify.com/embed/';
const TYPES = [
	'album',
	'artist',
	'playlist',
	'show',
	'track',
];

function linkToUri(link) {
	if (typeof link === 'string' && link.startsWith('https:')) {
		const url = new URL(link);
		const [type = null, id = null] = url.pathname.substr(1).split('/');

		if (
			url.host.toLowerCase() === 'open.spotify.com'
			&& typeof type === 'string'
			&& typeof id === 'string'
		) {
			return `spotify:${type}:${id}`;
		} else {
			return null;
		}
	} else {
		return null;
	}
}

function uriToLink(uri) {
	if (typeof uri === 'string' && uri.startsWith('spotify:')) {
		const [, type = null, id = null] = uri.split(':');

		if (typeof type == 'string' && typeof id === 'string') {
			const url = new URL(`${type}/${id}`, 'https://open.spotify.com');
			return url.href;
		} else {
			return null;
		}
	} else {
		return null;
	}
}

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

	get link() {
		if (this.hasAttribute('link')) {
			return this.getAttribute('link');
		} else if (this.hasAttribute('uri')) {
			return uriToLink(this.getAttribute('uri'));
		} else {
			return null;
		}
	}

	set link(val) {
		if (typeof val === 'string' && val.startsWith('https:')) {
			this.uri = null;
			this.setAttribute('link', val);
		} else {
			this.removeAttribute('link');
		}
	}

	get uri() {
		if (this.hasAttribute('uri')) {
			return this.getAttribute('uri');
		} else if (this.hasAttribute('link')) {
			return linkToUri(this.getAttribute('link'));
		} else {
			return null;
		}
	}

	set uri(val) {
		if (typeof val === 'string' && val.startsWith('spotify:')) {
			this.link = null;
			this.setAttribute('uri', val);
		} else {
			this.removeAttribute('uri');
		}
	}

	open() {
		const link = this.link;
		if (typeof link === 'string') {
			window.open(link, '_blank', 'noopener,noreferrer');
			return true;
		} else {
			return false;
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
		case 'link':
			this.ready.then(async () => {
				if (typeof newValue === 'string') {
					const {type, id} = parseURI(this.uri);

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
			'link',
		];
	}
});
