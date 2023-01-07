import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { createIframe } from '../../js/std-js/elements.js';
import { loaded } from '../../js/std-js/events.js';
import { getString, setString, getInt, setInt } from '../../js/std-js/attrs.js';

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

				const iframe = createIframe(null, {
					srcdoc: `<!DOCTYPE html><html><head>${base.outerHTML}${link.outerHTML}</head><body>${script.outerHTML}</body></html>`,
					referrerPolicy: 'no-referrer',
					sandbox: ['allow-scripts', 'allow-popups'],
					width,
					height,
					part: ['embed'],
				});

				shadow.replaceChildren(iframe);
				protectedData.set(target, { shadow, timeout: null });
				loaded(iframe).then(() => target.dispatchEvent(new Event('load')));
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
		return getString(this, 'file');
	}

	set file(val) {
		setString(this, 'file', val);
	}

	get gist() {
		return getString(this, 'gist');
	}

	set gist(val) {
		setString(this, 'gist', val);
	}

	get height() {
		return getInt(this, 'height');
	}

	set height(val) {
		setInt(this, 'height', val, { min: 0 });
	}

	get loading() {
		return getString(this, 'loading', { fallback: 'eager' });
	}

	set loading(val) {
		setString(this, 'loading',val);
	}

	get user() {
		return getString(this, 'user');
	}

	set user(val) {
		setString(this, 'user', val);
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
		return getInt(this, 'width');
	}

	set width(val) {
		setInt(this, 'width', val,{ min: 0 });
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
