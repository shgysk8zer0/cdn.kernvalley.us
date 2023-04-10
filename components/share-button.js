import './toast-message.js';
import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { shim } from '../js/std-js/share.js';
import { GET } from '../js/std-js/http.js';
import { getString, setString } from '../js/std-js/attrs.js';
import { hasGa, send } from '../js/std-js/google-analytics.js';
import UTM from '../js/std-js/UTM.js';
import { Facebook, Twitter, LinkedIn, Reddit, Gmail, Pinterest, Telegram, Tumblr,
	Email } from '../js/std-js/share-targets.js';

shim([Facebook, Twitter, LinkedIn, Reddit, Tumblr, Pinterest, Telegram, Gmail, Email]);

function log({ url: eventAction, shareTitle: eventLabel, hitType = 'event',
	transport = 'beacon', eventCategory = 'share-button'
}) {
	if (hasGa()) {
		send({ hitType, eventCategory, eventAction, eventLabel, transport });
	}
}

async function getFiles(file) {
	if (typeof file !== 'string' || ! (navigator.canShare instanceof Function)) {
		return [];
	} else {
		const resp = await GET(file);

		if (! resp.ok) {
			throw new Error(`Failed fetching ${file} [${resp.status} ${resp.statusText}]`);
		} else if (! resp.headers.has('Content-Type')) {
			throw new Error(`Unknown Content-Type for ${file}`);
		} else {
			const path = file.split('/');
			const name = path[path.length - 1];
			const type = resp.headers.get('Content-Type').split(';')[0];
			const files = [new File([await resp.blob()], name, { type })];
			return navigator.canShare({ title: 'test', files }) ? files : [];
		}
	}
}

registerCustomElement('share-button', class HTMLShareButtonElement extends HTMLButtonElement {
	constructor({ shareTitle, title, text, url, file, source, medium, content } = {}) {
		super();

		this.addEventListener('connected', () => {
			if (typeof shareTitle === 'string') {
				this.shareTitle = shareTitle;
			} else if (typeof title === 'string') {
				console.warn('Use of `title` is deprecated. Please use `shareTitle` instead.');
				this.shareTitle = title;
			}

			if (typeof text === 'string') {
				this.text = text;
			}

			if (typeof url === 'string') {
				this.url = url;
			}

			if (typeof source === 'string') {
				this.source = source;
			}

			if (typeof medium === 'string') {
				this.medium = medium;
			}

			if (typeof content === 'string') {
				this.content = content;
			}

			if (typeof file === 'string') {
				this.file = file;
			}
		}, { once: true });
	}

	connectedCallback() {
		this.hidden = ! (navigator.share instanceof Function);

		this.addEventListener('click', async event => {
			event.preventDefault();
			event.stopPropagation();

			if (event.isTrusted !== false) {
				this.disabled = true;

				try {
					const { shareTitle: title, text, url, file } = this;

					if (typeof file === 'string' && navigator.canShare instanceof Function) {
						const files = await getFiles(file);
						await navigator.share({ title, text, url, files });
						log(this);
					} else {
						await navigator.share({ title, text, url });
						log(this);
					}
				} catch (err) {
					console.error(err);
				} finally {
					this.disabled = false;
				}
			}
		});

		this.dispatchEvent(new Event('connected'));
	}

	get content() {
		return getString(this, 'content', { fallback: 'share-button' });
	}

	set content(val) {
		setString(this, 'content', val);
	}

	get file() {
		if (this.hasAttribute('file')) {
			return new URL(this.getAttribute('file'), document.baseURI).href;
		} else {
			return null;
		}
	}

	set file(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('file', new URL(val, document.baseURI));
		} else {
			this.removeAttribute('file');
		}
	}

	get medium() {
		return getString(this, 'medium', { fallback: 'share' });
	}

	set medium(val) {
		setString(this, 'medium', val);
	}

	get shareTitle() {
		return getString(this, 'sharetitle', { fallback: document.title });
	}

	set shareTitle(val) {
		setString(this, 'sharetitle', val);
	}

	get source() {
		return getString(this, 'source');
	}

	set source(val) {
		setString(this, 'source', val);
	}

	get text() {
		return getString(this, 'text');
	}

	set text(val) {
		setString(this, 'text', val);
	}

	get url() {
		if (this.hasAttribute('url')) {
			const url = new URL(this.getAttribute('url'), location.href).href;
			const { source, medium, content } = this;

			return new UTM(url, { source, medium, content }).href;
		} else if (this.hasAttribute('source')) {
			const { source, medium, content } = this;

			return new UTM(location.href, { source, medium, content });
		} else {
			return location.href;
		}
	}

	set url(url) {
		if (typeof url === 'string' && url.length !== 0) {
			this.setAttribute('url', url);
		} else {
			this.removeAttribute('url');
		}
	}

	/**
	 * @deprecated
	 */
	get title() {
		console.warn('Use of `title` is deprecated. Please use `shareTitle` instead');
		return this.hasAttribute('title') ? this.getAttribute('title') : document.title;
	}

	/**
	 * @deprecated
	 */
	set title(title) {
		console.warn('Use of `title` is deprecated. Please use `shareTitle` instead');
		this.setAttribute('title', title);
	}
}, { extends: 'button' });
