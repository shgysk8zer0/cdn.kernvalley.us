import HTMLCustomElement from '../custom-element.js';
const YOUTUBE  = 'https://www.youtube.com/embed/';
const NOCOOKIE = 'https://www.youtube-nocookie.com/embed/';

HTMLCustomElement.register('youtube-player', class HTMLYouTubeElement extends HTMLCustomElement {
	constructor(video = null, { height = null, width = null, loading = null } = {}) {
		super();
		this.attachShadow({ mode: 'open' });
		const slot = document.createElement('slot');
		slot.name = 'player';
		this.shadowRoot.append(slot);

		Promise.resolve().then(() => {
			if (typeof video === 'string') {
				this.video = video;
			}

			if (Number.isInteger(width)) {
				this.width = width;
			}

			if (Number.isInteger(height)) {
				this.height = height;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}

			this.dispatchEvent(new Event('ready'));
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

	attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
			case 'height':
			case 'width':
				this.ready.then(() => {
					const slot = this.shadowRoot.querySelector('slot[name="player"]');
					slot.assignedNodes().forEach(el => el[name] = newValue);
				});
				break;

			case 'video':
				if (newValue !== null && newValue.length !== 0) {
					this.ready.then(async () => {
						const { video, cookies, loading } = this;
						const url = new URL(`./${video}`, cookies ? YOUTUBE : NOCOOKIE);
						const iframe = document.createElement('iframe');
						iframe.slot = 'player';
						iframe.height = this.height;
						iframe.width = this.width;
						iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
						iframe.allowFullscreen = true;
						iframe.referrerPolicy = 'origin';

						iframe.style.setProperty('border', 'none');

						if ('sandbox' in iframe) {
							iframe.sandbox.add('allow-scripts', 'allow-popups', 'allow-same-origin');
						}

						iframe.addEventListener('load', () => {
							this.dispatchEvent(new Event('load'));
						}, {once: true});

						this.shadowRoot.querySelector('slot[name="player"]')
							.assignedNodes().forEach(el => el.remove());

						if ('loading' in iframe) {
							iframe.loading = loading;
							iframe.src = url;
							this.append(iframe);
						} else  if (loading === 'lazy' && ('IntersectionObserver' in window)) {
							iframe.setAttribute('loading', 'lazy');
							new IntersectionObserver(([{ target, isIntersecting }], observer) => {
								if (isIntersecting) {
									iframe.src = url;
									this.append(iframe);
									observer.unobserve(target);
									observer.disconnect();
								}
							}, {
								rootMargin: `${Math.floor(0.2 * Math.max(screen.height, screen.width, 400))}px`,
							}).observe(this);
						} else {
							iframe.src = url;
							this.append(iframe);
						}
					});
				}
				break;

			default:
				throw new Error(`Unhandled attribute ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'video',
			'width',
			'height',
		];
	}
});
