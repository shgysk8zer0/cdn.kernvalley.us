
/**
 * NOTE: This **SHOUD** be loaded individually and without `async` in order to capture
 * the `postMessage()` from the service worker script. If the script has not loaded
 * by the time the message is posted, it will be missed. It
 *
 * Due to this restriction, the `<script>` **SHOULD** also be added prior to any
 * other scripts, stylesheets, or anything that may delay loading. It does not
 * need to be loaded as a module and can also handle shares via GET even without
 * needing support for the Share Target API.
 *
 * @TODO Handle file uploads, since files cannot be assigned to `<input type="file">`s
 */
((customElements) => {
	'use strict';
	const postData = new Promise(async resolve => {
		navigator.serviceWorker.addEventListener('message', event => {
			if (event.data && event.data.type === 'share-target') {
				resolve(event.data.formData || {});
			}
		});
	});

	/**
	 * Necessary because Android plops the URL at the end of text
	 * instead of setting url correctly for the share API
	 */
	function parseValues({ title, text = null, url = null, files, params = {} } = {}) {
		if (('text' in params) && typeof text === 'string' && text.length !== 0 && (typeof url !== 'string' || url.length === 0)) {
			const words = text.trim().split(' ');
			const end = words.splice(-1)[0];

			/**
			 * Check if `text` ends with a URL
			 */
			if (end.startsWith('https://') || end.startsWith('http://')) {
				url = end;
				text = words.join(' ');
			}
		} else if (('text' in params) && typeof text === 'string' && typeof url == 'string' && url.length === 0 && text.endsWith(url)) {
			/**
			 * URL given alone and in text
			 */
			text = text.replace(url, '').trim();
		} else if (typeof text === 'string' && typeof url === 'string' && text.endsWith(url)) {
			text = text.replace(url, '').trim();
		}

		return { title, text, url, files, params };
	}

	/**
	 * Do not import from `functions.js`, as that may incur additional loading time
	 * and, when other js is bundled, will result in siginfication duplication as well
	 * as importing `ready()` here along with the entire rest of the script without
	 * using anything else
	 */
	const ready =  document.readyState === 'loading'
		? new Promise(resolve => {
			document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
		}) : Promise.resolve();

	const shareData = new Promise(async (resolve, reject) => {
		await ready;
		const link = document.querySelector('link[rel="manifest"][href]');

		if (link instanceof HTMLLinkElement) {
			const resp = await fetch(link.href);

			if (resp.ok) {
				const manifest = await resp.json();
				if (! ('share_target' in manifest)) {
					reject(new Error('No `share_target` set in manifest'));
				} else {
					const params = manifest.share_target.params || {};
					const method = manifest.share_target.method || 'GET';

					if (method === 'GET' && location.pathname.startsWith(new URL(manifest.share_target.action, document.baseURI).pathname)) {
						const url = new URL(location.href);

						resolve(parseValues({
							title: url.searchParams.get(params.title || 'title'),
							text: url.searchParams.get(params.text || 'text'),
							url: url.searchParams.get(params.url || 'url'),
							params,
						}));

						url.searchParams.delete(params.title || 'title');
						url.searchParams.delete(params.text || 'text');
						url.searchParams.delete(params.url || 'url');

					} else if (method === 'POST') {
						const post = await postData;

						resolve(parseValues({
							title: post[params.title || 'title'],
							text: post[params.text || 'text'],
							url: post[params.url || 'url'],
							files: post.files,
							params,
						}));
					}
				}
			} else {
				reject(new Error('Error fetching manifest'));
			}
		}
	});

	customElements.define('share-target', class HTMLShareTargetElement extends HTMLFormElement {
		async connectedCallback() {
			const { title, text, url, files, params } = await shareData;
			const set = (name, value) => {
				if (typeof value === 'string' && value.length !== 0) {
					const input = this.querySelector(`[name="${name}"]`);

					if (input instanceof HTMLElement) {
						try {
							input.value = value;
							input.dispatchEvent(new Event('input'));
							input.dispatchEvent(new Event('change'));
						} catch(err) {
							console.error(err);
						}
					}
				}
			};

			if (title || text || url || files) {
				this.dispatchEvent(new CustomEvent('share', {
					detail: { title, text, url, files }
				}));
				set(params.title || 'title', title);
				set(params.text || 'text', text);
				set(params.url || 'url', url);

				if (this.clearUrlParams) {
					const u = new URL(location.href);
					u.searchParams.delete(params.title || 'title');
					u.searchParams.delete(params.text || 'text');
					u.searchParams.delete(params.url || 'url');
					history.replaceState(history.state, document.title, u.href);
				}
			}

			// @TODO handle files
			// if (typeof files !== 'undefined') {
			// 	Object.entries(files).forEach(([name, file]) => set(name, file));
			// }
		}

		get clearUrlParams() {
			return this.hasAttribute('clearurlparams');
		}

		set clearUrlParams(val) {
			this.toggleAttribute('clearurlparams', val);
		}
	}, {
		extends: 'form',
	});
})(window.customElements || {define: () => {}});
