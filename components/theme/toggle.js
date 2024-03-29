import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { getHTML } from '../../js/std-js/http.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { purify as policy } from '../../js/std-js/htmlpurify.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { on } from '../../js/std-js/dom.js';
import { meta } from '../../import.meta.js';

const symbols = {
	shadow: Symbol('shadow'),
};

const { resolve, promise: def } = getDeferred();
const templatePromise = def.then(() => getHTML(new URL('./components/theme/toggle.html', meta.url), { policy }));

async function getTemplate() {
	resolve();
	const tmp = await templatePromise;
	return tmp.cloneNode(true);
}

registerCustomElement('theme-toggle', class HTMLThemeToggleElement extends HTMLElement {
	constructor({ domain, loading, maxAge, path, sameSite, secure } = {}) {
		super();

		Object.defineProperty(this, symbols.shadow, {
			enumerable: false,
			writable: false,
			configurable: false,
			value: this.attachShadow({ mode: 'closed' }),
		});

		queueMicrotask(() => {
			if (typeof domain === 'string') {
				this.domain = domain;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}

			if (Number.isSafeInteger(maxAge)) {
				this.maxAge = maxAge;
			}

			if (typeof path === 'string') {
				this.path = path;
			}

			if (typeof sameSite === 'string') {
				this.sameSite = sameSite;
			}

			if (typeof secure === 'boolean') {
				this.secure = secure;
			}
		});
	}

	async connectedCallback() {
		const shadow = this[symbols.shadow];
		await loadStylesheet(new URL('./components/theme/toggle.css', meta.url), { parent: shadow });

		if (this.loading === 'lazy') {
			await whenIntersecting(this);
		}

		const tmp = await getTemplate();
		const name = 'theme';

		await cookieStore.get(name).then(cookie => {
			if (cookie == null) {
				this.theme = 'auto';
				tmp.querySelector('button[data-theme="auto"]').disabled = true;
			} else {
				this.theme = cookie.value;
				tmp.querySelectorAll('button[data-theme]')
					.forEach(btn => btn.disabled = btn.dataset.theme === cookie.value);
			}
		});

		on(tmp.querySelectorAll('button[data-theme]'), 'click', ({ target }) => {
			const value = target.closest('button[data-theme]').dataset.theme;
			const { domain, path, secure, sameSite, maxAge } = this;

			if (value === 'auto') {
				cookieStore.delete({ name, domain, path, secure, sameSite });
			} else {
				cookieStore.set({ name, value, domain, path, secure, sameSite, maxAge });
			}
		});

		shadow.append(tmp);

		cookieStore.addEventListener('change', ({ deleted, changed }) => {
			const change = changed.find(c => c.name === name);
			const del = deleted.find(c => c.name === name);
			const btns = this[symbols.shadow].querySelectorAll('button[data-theme]');

			if (typeof change !== 'undefined') {
				this.theme = change.value;
				btns.forEach(btn => btn.disabled = btn.dataset.theme === change.value);
			} else if (typeof del !== 'undefined') {
				this.theme = 'auto';
				btns.forEach(btn => btn.disabled = btn.dataset.theme === 'auto');
			}
		});

		this.dispatchEvent(new Event('ready'));
	}

	get domain() {
		return this.getAttribute('domain') || undefined;
	}

	set domain(val) {
		if (val instanceof URL) {
			this.setAttribute('domain', val.host);
		} else if (typeof value === 'string' && val.length !== 0) {
			this.setAttribute('domain', val);
		} else {
			this.removeAttribute('domain');
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

	get maxAge() {
		return parseInt(this.getAttribute('maxage')) || undefined;
	}

	set maxAge(val) {
		if (typeof val === 'string') {
			this.maxAge = parseInt(val);
		} else if (Number.isSafeInteger(val) && val > 0) {
			this.setAttribute('maxage', val.toString());
		} else {
			this.removeAttribute('maxage');
		}
	}

	get path() {
		if (this.hasAttribute('path')) {
			return new URL(this.getAttribute('path'), location.origin).pathname;
		} else {
			return '/';
		}
	}

	set path(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('path', val);
		} else {
			this.removeAttribute('path');
		}
	}

	get ready() {
		const { resolve, promise } = getDeferred();
		if (this[symbols.shadow].childElementCount > 2) {
			resolve();
		} else {
			this.addEventListener('ready', () => resolve(), { once:true });
		}

		return promise;
	}

	get sameSite() {
		return this.getAttribute('samesite') || 'strict';
	}

	set sameSite(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('samesite', val);
		} else {
			this.removeAttribute('samesite');
		}
	}

	get secure() {
		return this.hasAttribute('secure');
	}

	set secure(val) {
		this.toggleAttribute('secure', val);
	}

	get theme() {
		return this.getAttribute('theme') || 'auto';
	}

	set theme(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribute('theme');
		}
	}

	static async asDialog({ domain, maxAge, path, sameSite, secure, signal, text = 'Choose theme' } = {}) {
		const { resolve, reject, promise } = getDeferred();

		if (signal instanceof AbortSignal && signal.aborted) {
			reject(signal.reason);
		} else {
			const dialog = document.createElement('dialog');
			const close = document.createElement('button');
			const toggle = new HTMLThemeToggleElement({ domain, path, sameSite, secure, maxAge });
			const h = document.createElement('h4');

			close.classList.add('btn', 'btn-reject', 'float-right');
			close.textContent = 'x';
			close.style.setProperty('margin-left', '6px');

			h.classList.add('center');
			h.textContent = text;
			h.append(close);

			if (signal instanceof AbortSignal) {
				signal.addEventListener('abort', ({ target: { reason }}) => {
					reject(reason);
					dialog.close();
					dialog.remove();
				}, { once: true });
			}

			close.addEventListener('click', ({ target }) => {
				target.closest('dialog').close();
			}, { signal });

			dialog.addEventListener('close', ({ target }) => {
				resolve();
				target.remove();
			}, { signal });

			dialog.append(h, toggle);

			document.body.append(dialog);
			await toggle.ready;
			dialog.showModal();
		}

		return promise;
	}
});
