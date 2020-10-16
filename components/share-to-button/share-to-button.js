import HTMLCustomElement from '../custom-element.js';

const urls = {
	facebook: 'https://www.facebook.com/sharer/sharer.php?u&t',
	twitter: 'https://twitter.com/intent/tweet/?text&url',
	reddit: 'https://www.reddit.com/submit/?url&title',
	linkedIn: 'https://www.linkedin.com/shareArticle/?title&summary&url',
	gmail: 'https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&su=&body=',
};

async function openPopup(url, {
	title = 'SharePopup',
	height = 360,
	width = 720,
} = {}) {
	window.open(url, title, `width=${width},height=${height},resizable,scrollbars,noopener,noreferrer,toolbar=no,menubar=no,location=no,status=no`);
}

async function share({
	target,
	shareTitle = document.title,
	text = '',
	url = location.href,
}) {
	switch(target.toLowerCase()) {
		case 'facebook':
			(() => {
				const link = new URL(urls.facebook);
				link.searchParams.set('u', url);
				link.searchParams.set('t', shareTitle);
				openPopup(link);
			})();
			break;

		case 'twitter':
			(() => {
				const link = new URL(urls.twitter);
				link.searchParams.set('text', shareTitle);
				link.searchParams.set('url', url);
				openPopup(link);
			})();
			break;

		case 'reddit':
			(() => {
				const link = new URL(urls.reddit);
				link.searchParams.set('url', url);
				link.searchParams.set('title', shareTitle);
				openPopup(link);
			})();
			break;

		case 'linkedin':
			(() => {
				const link = new URL(urls.linkedIn);
				link.searchParams.set('title', shareTitle);
				link.searchParams.set('summary', text);
				link.searchParams.set('url', url);
				openPopup(link);
			})();
			break;

		case 'gmail':
			(() => {
				const link = new URL(urls.gmail);
				link.searchParams.set('su', shareTitle);
				if (typeof text === 'string' && text !== '') {
					link.searchParams.set('body', `${shareTitle} <${url}>\n${text}`);
				} else {
					link.searchParams.set('body', `${shareTitle} <${url}>`);
				}
				openPopup(link);
			})();
			break;

		case 'clipboard':
			if (typeof text === 'string' && text.length !== 0) {
				navigator.clipboard.writeText(`${shareTitle} <${url}>\n${text}`)
					.then(() => alert('Copied to clipboard'));
			} else {
				navigator.clipboard.writeText(`${shareTitle} <${url}>`)
					.then(() => alert('Copied to clipboard'));
			}
			break;

		case 'print':
			window.print();
			break;

		case 'email':
			(() => {
				const link = new URL('mailto:');
				link.searchParams.set('subject', shareTitle);
				if (typeof text === 'string' && text.length > 0) {
					link.searchParams.set('body', `${shareTitle} <${url}>\n${text}`);
				} else {
					link.searchParams.set('body', `${shareTitle} <${url}>`);
				}
				location.href = link;
			})();
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
			this.dispatchEvent(new Event('ready'));
		});

		this.addEventListener('click', () => share(this));

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
					url.searchParams.set('utm_souce', source);
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
					url.searchParams.set('utm_souce', source);
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
