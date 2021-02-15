import { registerCustomElement } from '../../js/std-js/functions.js';

function getIframe({ uri, details, theme, followers }) {
	const iframe = document.createElement('iframe');
	const url = new URL('https://open.spotify.com/follow/1/');
	url.searchParams.set('uri', uri);
	url.searchParams.set('size', details ? 'detail' : 'basic');
	url.searchParams.set('theme', theme);

	if (followers === false) {
		url.searchParams.set('show-count', '0');
	}

	iframe.height = details ? 56 : 25;
	iframe.width = details ? 300 : 200;
	iframe.setAttribute('allowtransparency', 'true');
	iframe.allow = 'encrypted-media';
	iframe.referrerPolicy = 'origin';
	iframe.loading = 'lazy';
	iframe.style.setProperty('border', 'none');

	if ('sandbox' in iframe) {
		iframe.sandbox.add('allow-scripts', 'allow-popups', 'allow-same-origin');
	}

	if ('part' in iframe) {
		iframe.part.add('view');
	}

	iframe.src = url;

	return iframe;
}

registerCustomElement('spotify-follow', class HTMLFollowElement extends HTMLElement {
	constructor(artist = null, {
		details   = null,
		theme     = null,
		followers = null
	} = {}) {
		super();
		this.attachShadow({mode: 'open'});

		if (typeof artist === 'string') {
			this.artist = artist;
		}

		if (typeof details === 'boolean') {
			this.details = details;
		}

		if (typeof theme === 'string') {
			this.theme = theme;
		}

		if (typeof followers === 'boolean') {
			this.followers = followers;
		}
	}

	get artist() {
		return this.getAttribute('artist');
	}

	set artist(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('artist', val);
		} else {
			this.removeAttribute('artist');
		}
	}

	get artistURI() {
		const artist = this.artist;
		if (typeof artist === 'string') {
			return `spotify:artist:${artist}`;
		} else {
			return null;
		}
	}

	get dark() {
		return this.hasAttribute('dark');
	}

	set dark(val) {
		this.toggleAttribute('dark', val);
	}

	get details() {
		return this.hasAttribute('details');
	}

	set details(val) {
		this.toggleAttribute('details', val);
	}

	get followers() {
		return this.hasAttribute('followers');
	}

	set followers(val) {
		this.toggleAttribute('followers', val);
	}

	get theme() {
		switch(this.getAttribute('theme')) {
			case 'dark':
				return 'dark';

			case 'light':
				return 'light';

			default:
				return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
	}

	set theme(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribute('theme');
		}
	}

	async attributeChangedCallback(name) {
		const { theme, details, artist, followers } = this;
		switch(name) {
			case 'artist':
			case 'details':
			case 'theme':
				this.shadowRoot.childNodes.forEach(el => el.remove());
				this.shadowRoot.append(getIframe({
					theme,
					details,
					uri: `spotify:artist:${artist}`,
					followers,
				}));
				break;
		}
	}

	static get observedAttributes() {
		return [
			'artist',
			'details',
			'followers',
			'theme',
		];
	}
});
