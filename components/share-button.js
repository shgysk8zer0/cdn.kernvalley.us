import './toast-message.js';
import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { shim } from '../js/std-js/share.js';
import { GET } from '../js/std-js/http.js';
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

const supportsFiles = navigator.canShare instanceof Function && navigator.canShare({ text: 'hi', files: [new File([''], 'text.txt', { type: 'text/plain' })]});

async function getFiles(file) {
	if (supportsFiles && typeof file === 'string') {
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
			return files;
		}
	} else {
		return [];
	}
}

registerCustomElement('share-button', class HTMLShareButtonElement extends HTMLButtonElement {
	constructor({ shareTitle, title, text, url, file, source, medium, content } = {}) {
		super();

		this.addEventListener('connected', () => {
			this.hidden = ! (navigator.share instanceof Function);

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

		this.addEventListener('click', async event => {
			event.preventDefault();
			event.stopPropagation();

			if (event.isTrusted !== false) {
				this.disabled = true;

				try {
					const { shareTitle: title, text, url, file } = this;

					if (supportsFiles && typeof file === 'string') {
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
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get content() {
		return this.getAttribute('content') || 'share-button';
	}

	set content(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('content', val);
		} else {
			this.removeAttribute('content');
		}
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
		return this.getAttribute('medium') || 'share';
	}

	set medium(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('medium', val);
		} else {
			this.removeAttribute('medium');
		}
	}

	get shareTitle() {
		return this.getAttribute('sharetitle') || this.title || document.title;
	}

	set shareTitle(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('sharetitle', val);
		} else {
			this.removeAttribute('sharetitle');
		}
	}

	get source() {
		return this.getAttribute('source');
	}

	set source(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('source', val);
		} else {
			this.removeAttribute('source');
		}
	}

	get text() {
		return this.getAttribute('text');
	}

	set text(text) {
		this.setAttribute('text', text);
	}

	get url() {
		if (this.hasAttribute('url')) {
			const url = this.getAttribute('url');
			const { source, medium, content } = this;

			return new UTM(url, { source, medium, content }).href;
		} else {
			const { source, medium, content } = this;

			return new UTM(location.href, { source, medium, content });
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
