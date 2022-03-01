import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { whenIntersecting } from '../../intersect.js';

const symbols = {
	shadow: Symbol('shadow'),
	timeout: Symbol('timeout'),
};

registerCustomElement('facebook-post', class HTMLFacebookPostElement extends HTMLElement {
	constructor({ user, post, width, height } = {}) {
		super();

		Object.defineProperties(this, {
			[symbols.shadow]: {
				configurable: false,
				enumberable: false,
				writable: false,
				value: this.attachShadow({ mode: 'closed' }),
			},
			[symbols.timeout]: {
				enumerable: false,
				configurable: false,
				writable: true,
				value: NaN,
			}
		});

		if (typeof user === 'string') {
			this.user = user;
		}

		if (typeof post === 'string') {
			this.post = post;
		}

		if (Number.isSafeInteger(width)) {
			this.width = width;
		}

		if (Number.isSafeInteger(height)) {
			this.height = height;
		}
	}

	attributeChangedCallback() {
		if (! Number.isNaN(this[symbols.timeout])) {
			clearTimeout(this[symbols.timeout]);
		}

		this[symbols.timeout] = setTimeout(async () => {
			this[symbols.timeout] = NaN;
			await this.whenConnected;

			this.render().then(() => {
				this.dispatchEvent(new Event('load'));
			}).catch(error => {
				this.dispatchEvent(new ErrorEvent('error', { error, message: 'Error updating post' }));
			});
		}, 50);
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	async render({ signal } = {}) {
		const { postURL, height, width, showText } = this;

		if (typeof postURL === 'string') {
			const iframe = document.createElement('iframe');
			const url = new URL('https://www.facebook.com/plugins/post.php');
			const { resolve, reject, promise } = getDeferred();
			const controller = new AbortController();

			url.searchParams.set('href', postURL);

			if (showText) {
				url.searchParams.set('show_text', 'true');
			}

			iframe.frameBorder = '0';
			iframe.scrolling = 'no';
			iframe.referrerPolicy = 'origin';
			iframe.allow = 'encrypted-media; web-share';
			iframe.sandbox = 'allow-scripts, allow-top-navigation';
			iframe.part.add('embed');

			if (! (Number.isNaN(width) || Number.isNaN(height))) {
				iframe.width = width;
				iframe.height = height;
				url.searchParam.set('width', width);
			}

			iframe.addEventListener('load', () => {
				resolve();
				controller.abort();
			}, { once: true, signal: controller.signal });

			iframe.addEventListener('error', () => {
				reject(new DOMException('Error loading Facebook post'));
				controller.abort();
			}, { once: true, signal: controller.signal });

			await whenIntersecting(this, { signal });
			iframe.src = url.href;
			this[symbols.shadow].replaceChildren(iframe);

			return promise;
		}
	}

	get height() {
		return parseInt(this.getAttribute('height'));
	}

	set height(val) {
		if (Number.isSafeInteger(val) && val > 0) {
			this.setAttribute('height', val);
		} else {
			this.removeAttribute('height');
		}
	}

	get post() {
		return this.getAttribute('post');
	}

	set post(val) {
		if (typeof val === 'string') {
			this.setAttribute('post', val);
		} else {
			this.removeAttribute('post');
		}
	}

	get postURL() {
		const { post, user } = this;
		if (typeof post === 'string' && typeof user === 'string') {
			return new URL(`/${user}/posts/${post}`, 'https://www.facebook.com/').href;
		} else {
			return null;
		}
	}

	get showText() {
		return this.hasAttribute('showtext');
	}

	set showText(val) {
		this.toggleAttribute('showtext', val);
	}

	get user() {
		return this.getAttribute('user');
	}

	set user(val) {
		if (typeof val === 'string') {
			this.setAttribute('user', val);
		} else {
			this.removeAttribute('user', val);
		}
	}

	get whenConnected() {
		const { resolve, promise } = getDeferred();

		if (this.isConnected) {
			resolve();
		} else {
			this.addEventListener('connected', () => resolve(), { once: true });
		}

		return promise;
	}

	get width() {
		return parseInt(this.getAttribute('width'));
	}

	set width(val) {
		if (Number.isSafeInteger(val) && val > 0) {
			this.setAttribute('width', val);
		} else {
			this.removeAttribute('width');
		}
	}

	static get observedAttributes() {
		return ['user', 'post', 'width', 'height', 'showtext'];
	}

	static fromPostURL(url, { width, height, showText } = {}) {
		if (typeof url !== 'string') {
			throw new TypeError('Post URL must be a string');
		}

		const { pathname } = new URL(url);
		const [user,, post] = pathname.substr(1).split('/');

		if (typeof user === 'string' && typeof post === 'string') {
			return new HTMLFacebookPostElement({ user, post, width, height, showText });
		} else {
			throw new Error('Invalid Post URL');
		}
	}
});
