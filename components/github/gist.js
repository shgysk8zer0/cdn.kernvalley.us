import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { createIframe, createScript } from '../../js/std-js/elements.js';
import { createPolicy } from '../../js/std-js/trust.js';
import { getString, setString, getInt, setInt } from '../../js/std-js/attrs.js';

const policy = createPolicy('github#gist', {
	createHTML: input => input,
	createScriptURL: input => {
		if (input.startsWith('https://gist.github.com/')) {
			return input;
		} else {
			throw new TypeError(`Invalid Gist URL: ${input}`);
		}
	},
});

export const trustedPolicies = [policy.name];

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
			shadow,
			timeout: requestAnimationFrame(async () => {
				const { user, gist, file, height, width } = target;
				const { resolve, reject, promise } = getDeferred();
				const src = new URL(`/${user}/${gist}.js`, 'https://gist.github.com');
				const script = createScript(policy.createScriptURL(src.href), { defer: false, async: false, referrerPolicy: 'no-referrer' });
				const link = document.createElement('link');
				const base = document.createElement('base');
				link.rel = 'preconnect';
				link.href = 'https://github.githubassets.com';
				base.target = '_blank';

				if (typeof file === 'string' && file.length !== 0) {
					src.searchParams.set('file', file);
				}

				const iframe = createIframe(null, {
					srcdoc: policy.createHTML(
						`<!DOCTYPE html><html><head>${base.outerHTML}${link.outerHTML}</head><body>${script.outerHTML}</body></html>`
					),
					referrerPolicy: 'no-referrer',
					sandbox: ['allow-scripts', 'allow-popups'],
					width,
					height,
					part: ['embed'],
					events: {
						load: () => {
							resolve();
							target.dispatchEvent(new Event('load'));
						},
						error: () => reject(new DOMException('Failed loading Gist')),
					}
				});

				shadow.replaceChildren(iframe);

				await promise;
			})
		});
	}
}

customElements.define('github-gist', class HTMLGitHubGistElement extends HTMLElement {
	constructor({ user, gist } = {}) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		protectedData.set(this, { shadow, timeout: null });

		requestAnimationFrame(() => {
			if (typeof user === 'string') {
				this.user = user;
			}

			if (typeof gist === 'string') {
				this.gist = gist;
			}
		});
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
