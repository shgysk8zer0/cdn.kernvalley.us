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
	title = document.title,
	text = '',
	url = location.href,
}) {
	switch(target.toLowerCase()) {
	case 'facebook':
		(() => {
			const link = new URL(urls.facebook);
			link.searchParams.set('u', url);
			link.searchParams.set('t', title);
			openPopup(link);
		})();
		break;

	case 'twitter':
		(() => {
			const link = new URL(urls.twitter);
			link.searchParams.set('text', title);
			link.searchParams.set('url', url);
			openPopup(link);
		})();
		break;

	case 'reddit':
		(() => {
			const link = new URL(urls.reddit);
			link.searchParams.set('url', url);
			link.searchParams.set('title', title);
			openPopup(link);
		})();
		break;

	case 'linkedin':
		(() => {
			const link = new URL(urls.linkedIn);
			link.searchParams.set('title', title);
			link.searchParams.set('summary', text);
			link.searchParams.set('url', url);
			openPopup(link);
		})();
		break;

	case 'gmail':
		(() => {
			const link = new URL(urls.gmail);
			link.searchParams.set('su', title);
			if (typeof text === 'string' && text !== '') {
				link.searchParams.set('body', `${title} <${url}>\n${text}`);
			} else {
				link.searchParams.set('body', `${title} <${url}>`);
			}
			openPopup(link);
		})();
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

	case 'email':
		(() => {
			const link = new URL('mailto:');
			link.searchParams.set('subject', title);
			if (typeof text === 'string' && text.length > 0) {
				link.searchParams.set('body', `${title} <${url}>\n${text}`);
			} else {
				link.searchParams.set('body', `${title} <${url}>`);
			}
			location.href = link;
		})();
		break;

	default:
		throw new Error(`Unknown share target: ${target}`);
	}
}

customElements.define('share-to-button', class HTMLShareToButtonElement extends HTMLElement {
	constructor() {
		super();
		this.setAttribute('tabindex', '0');
		this.attachShadow({mode: 'open'});

		fetch(new URL('./share-to-button.html', import.meta.url)).then(async resp => {
			const parser = new DOMParser();
			const html = await resp.text();
			const doc = parser.parseFromString(html, 'text/html');
			this.shadowRoot.append(...doc.head.children, ...doc.body.children);

			this.addEventListener('click', () => share({
				target: this.target,
				title: this.shareTitle,
				text: this.text,
				url: this.url,
			}));

			this.dispatchEvent(new Event('ready'));
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
			return new URL(this.getAttribute('url'), document.baseURI).href;
		} else {
			return location.href;
		}
	}

	set url(val) {
		this.setAttribute('url', val);
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
