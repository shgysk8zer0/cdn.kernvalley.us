import './toast-message.js';
import { registerCustomElement } from '../js/std-js/functions.js';
import { shim } from '../js/std-js/share.js';
import { Facebook, Twitter, LinkedIn, Reddit, Gmail, Pinterest, Telegram, Tumblr,
	Email } from '../js/std-js/share-targets.js';

shim([Facebook, Twitter, LinkedIn, Reddit, Tumblr, Pinterest, Telegram, Gmail, Email]);

export default class HTMLShareButtonElement extends HTMLButtonElement {
	constructor({ title = null, text = null, url = null, source = null, medium = null, content = null } = {}) {
		super();

		Promise.resolve().then(() => {
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
		});

		this.addEventListener('click', async event => {
			event.preventDefault();
			event.stopPropagation();

			try {
				const { title, text, url } = this;
				await navigator.share({ title, text, url });
			} catch (err) {
				console.error(err);
			}
		});
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
