'use strict';

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
	function parseValues({title, text = null, url = null, files} = {}) {
		if (typeof text === 'string' && text.length !== 0 && url === null) {
			const words = text.trim().split(' ');
			const end = words.splice(-1)[0];

			if (end.startsWith('https://') || end.startsWith('http://')) {
				url = end;
				text = words.join(' ');
			}
		}

		return { title, text, url, files };
	}

	/**
	 * Do not import from `functions.js`, as that may incur additional loading time
	 * and, when other js is bundled, will result in siginfication duplication as well
	 * as importing `ready()` here along with the entire rest of the script without
	 * using anything else
	 */
	const ready = new Promise(resolve => {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => resolve(), {once: true});
		} else {
			resolve();
		}
	});

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

					if (method === 'GET' && location.pathname.startsWith(manifest.share_target.action)) {
						const url = new URL(location.href);

						resolve(parseValues({
							title: url.searchParams.get(params.title || 'title'),
							text: url.searchParams.get(params.text || 'text'),
							url: url.searchParams.get(params.url || 'url'),
						}));

						url.searchParams.delete(params.title || 'title');
						url.searchParams.delete(params.text || 'text');
						url.searchParams.delete(params.url || 'url');
						history.replaceState(history.state, document.title, url.href);
					} else if (method === 'POST') {
						const post = await postData;

						resolve(parseValues({
							title: post[params.title || 'title'],
							text: post[params.text || 'text'],
							url: post[params.url || 'url'],
							files: post.files,
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
			const { title, text, url, files } = await shareData;

			if (title || text || url || files) {
				this.dispatchEvent(new CustomEvent('share', {
					detail: { title, text, url, files }
				}));
			}

			const set = (name, value) => {
				const input = this.querySelector(`[name="${name}"], [data-share-field="${name}"]`);

				if (typeof value !== 'undefined' && (input instanceof HTMLElement)) {
					try {
						input.value = value;
					} catch(err) {
						console.error(err);
					}
				}
			};

			set('title', title);
			set('text', text);
			set('url', url);

			// @TODO handle files
			// if (typeof files !== 'undefined') {
			// 	Object.entries(files).forEach(([name, file]) => set(name, file));
			// }
		}
	}, {
		extends: 'form',
	});
})(window.customElements || {define: () => {}});
