import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getDeferred } from '../../js/std-js/promises.js';

const protectedData = new WeakMap();

async function render(target, { signal } = {}) {
	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else {
		const { shadow, timeout } = protectedData.get(target);

		if (Number.isInteger(timeout)) {
			cancelAnimationFrame(timeout);
			protectedData.set(target, { shadow, timeout: null });
		}

		protectedData.set(target, {
			timeout: requestAnimationFrame(async () => {
				const { user, gist, file, height, width } = target;
				const iframe = document.createElement('iframe');
				const script = document.createElement('script');
				const link = document.createElement('link');
				const base = document.createElement('base');
				const src = new URL(`/${user}/${gist}.js`, 'https://gist.github.com');
				link.rel = 'preconnect';
				link.href = 'https://github.githubassets.com';
				base.target = '_blank';

				if (typeof file === 'string' && file.length !== 0) {
					src.searchParams.set('file', file);
				}

				script.src = src.href;

				iframe.referrerPolicy = 'no-referrer';
				iframe.sandbox.add('allow-scripts', 'allow-popups');
				iframe.frameBorder = 0;

				if (! Number.isNaN(width)) {
					iframe.width = width;
				}

				if (! Number.isNaN(height)) {
					iframe.height = height;
				}

				if ('part' in iframe) {
					iframe.part.add('embed');
				}

				iframe.srcdoc = `<!DOCTYPE html><html><head>${base.outerHTML}${link.outerHTML}</head><body>${script.outerHTML}</body></html>`;
				shadow.replaceChildren(iframe);
				target.dispatchEvent(new Event('load'));
				protectedData.set(target, { shadow, timeout: null });
			}),
			shadow,
		}, 100);
	}

}

customElements.define('github-gist', class HTMLGitHubGistElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		protectedData.set(this, { shadow, timeout: null });
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			await this.whenConnected;

			switch(name) {
				case 'user':
				case 'gist':
				case 'file':
					if (this.loading === 'lazy') {
						await whenIntersecting(this);
					}

					this.render();

					break;

				case 'width':
				case 'height':
					this.rendered.then(() => {
						const iframe = protectedData.get(this).shadow.querySelector('iframe');

						if (typeof newValue === 'string') {
							iframe.setAttribute(name, newValue);
						} else {
							iframe.removeAttribute(name);
						}
					});
					break;

				default:
					throw new DOMException(`Unhandled attribute changed: ${name}`);
			}
		}
	}

	async render({ signal } = {}) {
		return render(this, { signal });
	}

	get file() {
		return this.getAttribute('file');
	}

	set file(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('file', val);
		} else {
			this.removeAttribute('file');
		}
	}

	get gist() {
		return this.getAttribute('gist');
	}

	set gist(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('gist', val);
		} else {
			this.removeAttribute('gist');
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

	get loading() {
		return this.getAttribute('loading') || 'eager';
	}

	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.removeAttribute('val');
		}
	}

	get user() {
		return this.getAttribute('user');
	}

	set user(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('user', val);
		} else {
			this.removeAttribute('user');
		}
	}

	get rendered() {
		return this.whenConnected.then(() => {
			const { shadow } = protectedData.get(this);
			const { resolve, promise } = getDeferred();

			if (shadow.childElementCount === 0) {
				this.addEventListener('load', () => resolve(), { once: true });
			} else {
				resolve();
			}

			return promise;
		});
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

	get whenConnected() {
		const { resolve, promise } = getDeferred();

		if (this.isConnected) {
			resolve();
		} else {
			this.addEventListener('connected', () => resolve(), { once: true });
		}

		return promise;
	}

	static get observedAttributes() {
		return ['user', 'gist', 'file', 'width', 'height'];
	}

	static getGist({ user, gist, file, loading = 'eager', height = 250, width = 400 }) {
		const el = new HTMLGitHubGistElement();
		el.loading = loading;
		el.height = height;
		el.width = width;
		el.user = user;
		el.gist = gist;
		el.file = file;

		return el;
	}
});
