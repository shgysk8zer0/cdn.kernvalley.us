import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createIframe } from '../../js/std-js/elements.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { purify as policy } from '../../js/std-js/htmlpurify.js';
import { loaded } from '../../js/std-js/events.js';
import { getHTML } from '../../js/std-js/http.js';
import { getURLResolver } from '../../js/std-js/utility.js';
import { meta } from '../../import.meta.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getBool, setBool, getString, setString } from '../../js/std-js/attrs.js';

const protectedData = new WeakMap();
const resolveURL = getURLResolver({ path: '/components/spotify/', base: meta.url });
const getTemplate = (() => getHTML(resolveURL('./player.html'), { policy })).once();

const SPOTIFY = 'https://open.spotify.com/embed/';
const TYPES = [
	'album',
	'artist',
	'playlist',
	'show',
	'track',
];

const SANDBOX = ['allow-scripts', 'allow-popups', 'allow-same-origin'];
const ALLOW = ['encrypted-media'];

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

function parseURI(uri) {
	if (typeof uri !== 'string') {
		throw new Error('URI is not a string');
	} else if (! uri.startsWith('spotify:')) {
		throw new Error('URI is not a valid Spotify URI');
	} else {
		const [, type = '', id = ''] = uri.split(':');

		if (! TYPES.includes(type)) {
			throw new Error(`Unsupported type: ${type}`);
		} else {
			return { type, id };
		}
	}
}

registerCustomElement('spotify-player', class HTMLSpotifyPlayerElement extends HTMLElement {
	constructor({ uri = null, large = null, loading = null } = {}) {
		super();
		const shadow = this.attachShadow({ mode: 'open' });
		protectedData.set(this, { shadow });

		this.addEventListener('connected', async () => {
			if (typeof uri === 'string') {
				this.uri = uri;
			}

			if (typeof large === 'boolean') {
				this.large = large;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}

			if (this.loading === 'lazy') {
				await whenIntersecting(this);
			}

			Promise.all([
				getTemplate(),
				loadStylesheet(resolveURL('./player.css'),{ parent: shadow }),
			]).then(([tmp]) => {
				shadow.append(tmp.cloneNode(true));
				this.dispatchEvent(new Event('ready'));
			});
		}, { once: true });
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get ready() {
		return new Promise(resolve => {
			const { shadow } = protectedData.get(this);

			if (shadow.childElementCount < 2) {
				this.addEventListener('ready', () => resolve(), { once: true });
			} else {
				resolve();
			}
		});
	}

	get large() {
		return getBool(this, 'large');
	}

	set large(val) {
		setBool(this, 'large', val);
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

	get loading() {
		return getString(this, 'loading', { fallback: 'eager' });
	}

	set loading(val) {
		setString(this, 'loading', val);
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
			globalThis.open(link, '_blank', 'noopener, noreferrer');
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
					this.querySelectorAll('[slot="player"]').forEach(el => {
						el.height = size;
					});
				});
				break;

			case 'uri':
			case 'link':
				this.ready.then(async () => {
					if (typeof newValue === 'string') {
						const { uri, loading, large } = this;
						const { type = null, id = null } = parseURI(uri);

						if (loading === 'lazy') {
							await whenIntersecting(this);
						}

						const iframe = createIframe(new URL(`${type}/${id}`, SPOTIFY), {
							width: 300,
							height: large ? 380 : 80,
							referrerPolicy: 'origin',
							slot: 'player',
							sandbox: SANDBOX,
							allow: ALLOW,
							title: 'Spotify Player',
						});

						loaded(iframe).then(() => {
							this.dispatchEvent(new CustomEvent('trackchange', { detail: {
								from: oldValue,
								to: newValue
							}}));
						});

						this.querySelectorAll('[slot="player"]').forEach(el => el.remove());
						this.append(iframe);
					} else {
						this.querySelectorAll('[slot="player"]').forEach(el => el.remove());
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
