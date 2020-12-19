import HTMLCustomElement from '../custom-element.js';
import { openWindow } from '../../js/std-js/functions.js';
import { Facebook, Twitter, Reddit, LinkedIn, Gmail, Pinterest, Email, Tumblr, Telegram, getShareURL }
	from '../../js/std-js/share-targets.js';

function openShare(target, { title, text, url, height = 360, width = 720, name = 'SharePopup' } = {}) {
	openWindow(getShareURL(target, { title, text, url }), { height, width, name });
}

async function share({
	target,
	title = document.title,
	text = '',
	url = location.href,
}) {
	switch(target.toLowerCase()) {
		case 'facebook':
			openShare(Facebook, { title, text, url });
			break;

		case 'twitter':
			openShare(Twitter, { title, text, url });
			break;

		case 'reddit':
			openShare(Reddit, { title, text, url });
			break;

		case 'linkedin':
			openShare(LinkedIn, { title, text, url });
			break;

		case 'gmail':
			openShare(Gmail, { title, text, url });
			break;

		case 'pinterest':
			openShare(Pinterest, { title, text, url });
			break;

		case 'tumblr':
			openShare(Tumblr, { title, text, url });
			break;

		case 'telegram':
			openShare(Telegram, { title, text, url });
			break;

		case 'clipboard':
			if (typeof text === 'string' && text.length !== 0) {
				navigator.clipboard.writeText(`${title} <${url}>\n${text}`)
					.then(() => alert('Copied to clipboard'));
			} else {
				navigator.clipboard.writeText(`${title} <${url}>`)
					.then(() => alert('Copied to clipboard'));
			}
			break;

		case 'print':
			window.print();
			break;

		case 'email':
			openShare(Email, { title, text, url });
			break;

		default:
			throw new Error(`Unknown share target: ${target}`);
	}
}

HTMLCustomElement.register('share-to-button', class HTMLShareToButtonElement extends HTMLCustomElement {
	constructor({ target = null, url = null, source = null, medium = null, content = null } = {}) {
		super();
		this.attachShadow({mode: 'open'});

		Promise.resolve().then(() => {
			this.setAttribute('tabindex', '0');
			this.setAttribute('role', 'button');
		});

		this.getTemplate('./components/share-to-button/share-to-button.html').then(tmp => {
			const wasHidden = this.hidden;
			this.hidden = true;
			if (typeof target === 'string') {
				this.target = target;
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
			this.shadowRoot.append(tmp);
			this.stylesLoaded.then(() => {
				this.dispatchEvent(new Event('ready'));
				this.hidden = wasHidden;
			});
		});

		this.addEventListener('click', () => {
			const { shareTitle, target, url, text } = this;
			share({ target, title: shareTitle, url, text });
		});

		this.addEventListener('keypress', ({ charCode }) => {
			if (charCode === 32) {
				share(this);
			}
		});
	}

	get ready() {
		return new Promise(resolve => {
			if (this.shadowRoot.childElementCount === 0) {
				this.addEventListener('ready', () => resolve(this), {once: true});
			} else {
				resolve(this);
			}
		});
	}

	get content() {
		return this.getAttribute('content') || 'share-to-button';
	}

	set content(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('content', val);
		} else {
			this.removeAttribute('content');
		}
	}

	get disabled() {
		return this.hasAttribute('disabled');
	}

	set disabled(val) {
		this.toggleAttribute('disabled', val);
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

	get target() {
		return this.getAttribute('target');
	}

	set target(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('target', val);
		} else {
			this.removeAttribute('target');
		}
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

	get text() {
		return this.getAttribute('text');
	}

	set text(val) {
		this.setAttribute('text', val);
	}

	// `title` is not available, so use `sharetitle` / `shareTitle`

	get shareTitle() {
		return this.getAttribute('sharetitle') || document.title;
	}

	set shareTitle(val) {
		this.setAttribute('sharetitle', val);
	}

	get stack() {
		return this.hasAttribute('stack');
	}

	set stack(val) {
		this.toggleAttribute('stack', val);
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'target':
				if (typeof newValue !== 'string' || newValue.length === 0) {
					this.hidden = true;
				} else if (newValue.toLowerCase() === 'clipboard') {
					this.hidden = ! (('clipboard' in navigator) && navigator.clipboard.writeText instanceof Function);
				} else {
					this.ready.then(() => {
						this.shadowRoot.getElementById('network').textContent = newValue;
					});
					this.hidden = false;
				}
				break;

			default:
				throw new Error(`Unhandled attribute change: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'target',
		];
	}
});
