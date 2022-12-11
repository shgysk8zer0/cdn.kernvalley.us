import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createYouTubeEmbed } from '../../js/std-js/youtube.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { loaded } from '../../js/std-js/events.js';

const protectedData = new WeakMap();

registerCustomElement('youtube-player', class HTMLYouTubePlayerElement extends HTMLElement {
	constructor(video, { height, width, cookies, loading } = {}) {
		super();

		requestAnimationFrame(() => {
			if (typeof video === 'string') {
				this.video = video;
			}

			if (typeof height === 'number') {
				this.height = height;
			}

			if (typeof width === 'number') {
				this.width = width;
			}

			if (typeof coookies === 'boolean') {
				this.cookies = cookies;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}
		});

		protectedData.set(this, {
			shadow: this.attachShadow({ mode: 'closed' }),
			timeout: NaN,
		});
	}

	attributeChangedCallback(name, oldVal, newVal) {
		const { shadow, timeout } = protectedData.get(this);

		switch(name) {
			case 'height': {
				const iframe = shadow.querySelector('iframe');

				if (iframe instanceof HTMLIFrameElement) {
					iframe.height = newVal;
				}

				break;
			}

			case 'width': {
				const iframe = shadow.querySelector('iframe');

				if (iframe instanceof HTMLIFrameElement) {
					iframe.width = newVal;
				}

				break;
			}

			case 'cookies':
			case 'video':
				if (! Number.isNaN(timeout)) {
					clearTimeout(timeout);
				}

				protectedData.set(this, {
					shadow,
					timeout: setTimeout(() => {
						protectedData.set(this, { shadow, timeout: NaN });
						this.render().catch(console.error);
					}, 10),
				});

				break;

			default:
				throw new DOMException(`Unhandled attribute changed: "${name}"`);
		}
	}

	async render() {
		const { cookies, loading, height, width, video } = this;
		const { shadow } = protectedData.get(this);

		if (typeof video === 'string') {
			if (loading === 'lazy') {
				await whenIntersecting(this);
			}

			const iframe = createYouTubeEmbed(video, { width, height, cookies });

			const prom = loaded(iframe).then(() => this.dispatchEvent(new Event('ready')));

			shadow.replaceChildren(iframe);

			await prom;
		} else {
			shadow.replaceChildren();
		}
	}

	get ready() {
		return new Promise(resolve => {
			const { shadow } = protectedData.get(this);

			if (shadow.childElementCount === 0) {
				this.addEventListener('ready', () => resolve(), { once: true });
			} else {
				resolve();
			}
		});
	}

	get height() {
		return parseInt(this.getAttribute('height')) || 315;
	}

	set height(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('height', val);
		} else {
			this.removeAttribute('height');
		}
	}

	get width() {
		return parseInt(this.getAttribute('width')) || 560;
	}

	set width(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('width', val);
		} else {
			this.removeAttribute('width');
		}
	}

	get loading() {
		return this.getAttribute('loading') || 'eager';
	}

	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.removeAttribute('loading');
		}
	}

	get cookies() {
		return this.hasAttribute('cookies');
	}

	set cookies(val) {
		this.toggleAttribute('cookies', val);
	}

	get video() {
		const video = this.getAttribute('video');

		if (typeof video !== 'string') {
			return null;
		} else if (video.startsWith('https:')) {
			const url = new URL(video);

			if (url.host === 'youtu.be') {
				return url.pathname.substr(1);
			} else if (! url.host.endsWith('youtube.com')) {
				throw new Error('Invalid URL for YouTube');
			} else if (url.searchParams.has('v')) {
				return url.searchParams.get('v');
			} else if (url.pathname.startsWith('embed')) {
				return url.pathname.split('/')[2];
			} else {
				return url;
			}
		} else {
			return video;
		}
	}

	set video(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('video', val);
		} else {
			this.removeAttribute('video');
		}
	}

	static get observedAttributes() {
		return ['video', 'cookies', 'height', 'width'];
	}
});
