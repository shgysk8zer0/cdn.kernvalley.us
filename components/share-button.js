import './toast-message.js';
import { registerCustomElement } from '../js/std-js/functions.js';
import { shim } from '../js/std-js/share.js';
import { GET } from '../js/std-js/http.js';
import { Facebook, Twitter, LinkedIn, Reddit, Gmail, Pinterest, Telegram, Tumblr,
	Email } from '../js/std-js/share-targets.js';

shim([Facebook, Twitter, LinkedIn, Reddit, Tumblr, Pinterest, Telegram, Gmail, Email]);

function log(btn) {
	if (window.ga instanceof Function) {
		window.ga('send', {
			hitType: 'event',
			eventCategory: 'share-button',
			eventAction: btn.url,
			eventLabel: btn.title || document.title,
			transport: 'beacon',
		});
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

export default class HTMLShareButtonElement extends HTMLButtonElement {
	constructor({ title = null, text = null, url = null, file = null, source = null, medium = null, content = null } = {}) {
		super();

		this.addEventListener('connected', () => {
			this.hidden = !(navigator.share instanceof Function);

			if (typeof title === 'string') {
				this.title = title;
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
			this.disabled = true;

			try {
				const { title, text, url, file } = this;

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
			const url = new URL(this.getAttribute('url'), location.href);
			const { source, medium, content } = this;

			if (typeof source === 'string' && typeof medium === 'string') {
				if (! url.searchParams.has('utm_source')) {
					url.searchParams.set('utm_source', source);
				}

				if (! url.searchParams.has('utm_medium')) {
					url.searchParams.set('utm_medium', medium);
				}

				if (! url.searchParams.has('utm_content')) {
					url.searchParams.set('utm_content', content);
				}
			}

			return url.href;
		} else {
			const { source, medium, content } = this;

			if (typeof source === 'string' && typeof medium === 'string') {
				const url = new URL(location.href);

				if (! url.searchParams.has('utm_source')) {
					url.searchParams.set('utm_source', source);
				}

				if (! url.searchParams.has('utm_medium')) {
					url.searchParams.set('utm_medium', medium);
				}

				if (! url.searchParams.has('utm_content')) {
					url.searchParams.set('utm_content', content);
				}
				return url.href;
			} else {
				return location.href;
			}
		}
	}

	set url(url) {
		if (typeof url === 'string' && url.length !== 0) {
			this.setAttribute('url', url);
		} else {
			this.removeAttribute('url');
		}
	}

	get title() {
		return this.hasAttribute('title') ? this.getAttribute('title') : document.title;
	}

	set title(title) {
		this.setAttribute('title', title);
	}
}

registerCustomElement('share-button', HTMLShareButtonElement, { extends: 'button' });
