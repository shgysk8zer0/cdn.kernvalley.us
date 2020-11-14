import HTMLCustomElement from '../custom-element.js';

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

HTMLCustomElement.register('spotify-player', class HTMLSpotifyTrackElement extends HTMLCustomElement {
	constructor({ uri = null, large = null, loading = null } = {}) {
		super();
		this.attachShadow({ mode: 'open' });

		this.getTemplate('./components/spotify/player.html').then(tmp => {
			this.shadowRoot.append(tmp.cloneNode(true));
			this.dispatchEvent(new Event('ready'));
		});

		Promise.resolve().then(() => {
			if (typeof uri === 'string') {
				this.uri = uri;
			}

			if (typeof large === 'boolean') {
				this.large = large;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}
		});
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

	get loading() {
		return this.getAttribute('loading') || 'auto'
	}

	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.removeAttribute('loading');
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
						const { uri, loading, large } = this;
						const { type = null, id = null } = parseURI(uri);
						const iframe = document.createElement('iframe');
						iframe.width = 300;
						iframe.height = large ? 380 : 80;
						iframe.allowTransparency = true;
						iframe.allow = 'encrypted-media';
						iframe.referrerPolicy = 'origin';
						iframe.slot = 'player';

						if ('sandbox' in iframe) {
							iframe.sandbox.add('allow-scripts', 'allow-popups', 'allow-same-origin');
						}

						if ('loading' in iframe) {
							iframe.loading = loading;
							iframe.src = new URL(`${type}/${id}`, SPOTIFY).href;
							this.append(iframe);
						} else if (loading === 'lazy' && ('IntersectionObserver' in window)) {
							iframe.setAttribute('loading', 'lazy');
							new IntersectionObserver(([{ target, isIntersecting }], observer) => {
								if (isIntersecting) {
									iframe.src = new URL(`${type}/${id}`, SPOTIFY).href;
									this.append(iframe);
									observer.unobserve(target);
									observer.disconnect();
								}
							}, {
								rootMargin: `${Math.floor(0.2 * Math.max(screen.height, screen.width, 400))}px`,
							}).observe(this);
						} else {
							iframe.src = new URL(`${type}/${id}`, SPOTIFY).href;
							this.append(iframe);
						}

						iframe.addEventListener('load', async () => {
							this.dispatchEvent(new CustomEvent('trackchange', {detail: {
								from: oldValue,
								to: newValue,
							}}));
						}, {once: true});

						iframe.addEventListener('error', console.error, {once: true});

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
