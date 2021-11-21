/* eslint-env serviceworker */
/* eslint no-unused-vars: 0 */

function getURL({ request: { url }}) {
	if (url.includes('#')) {
		return url.substr(0, url.indexOf('#'));
	} else {
		return url;
	}
}

function init(worker, config) {
	worker.addEventListener('install', async event => {
		event.waitUntil((async () => {
			try {
				await caches.keys().then(async keys => {
					await Promise.allSettled(keys.filter(key => ! [config.version, 'user'].include(key)).map(key => {
						return caches.delete(key);
					}));
				}).catch(console.error);

				const cache = await caches.open(config.version);
				await cache.addAll([...config.stale || [], ...config.fresh || []]).catch(console.error);
			} catch (err) {
				console.error(err);
			}
		})());
	});

	if ('periodicSync' in config) {
		worker.addEventListener('periodicsync', event => {
			if (config[event.tag] instanceof Function) {
				event.waitUntil(config[event.tag].call(worker, { config, event }));
			} else {
				throw new Error(`Unhandled PeriodicSync tag: "${event.tag}"`);
			}
		});
	}

	worker.addEventListener('activate', event => event.waitUntil(clients.claim()));

	worker.addEventListener('fetch', event => {
		if (event.request.method === 'GET') {
			event.respondWith((async () => {
				const url = getURL(event);
				const cacheOpts = {
					ignoreSearch: event.request.mode === 'navigate',
					ignoreMethod: false,
					ignoreVary: false,
				};

				if (Array.isArray(config.stale) && config.stale.includes(url)) {
					const cached = await caches.match(event.request, cacheOpts);

					if (cached instanceof Response) {
						return cached;
					} else {
						const [resp, cache] = await Promise.all([
							fetch(event.request).catch(console.error),
							caches.open(config.version),
						]);

						if (resp.ok) {
							cache.put(event.request, resp.clone());
						}

						return resp;
					}
				} else if (Array.isArray(config.fresh) && config.fresh.includes(url)) {
					if (navigator.onLine) {
						const [resp, cache] = await Promise.all([
							fetch(event.request).catch(console.error),
							caches.open(config.version),
						]);

						if (resp.ok) {
							cache.put(event.request, resp.clone()).catch(console.error);
						}

						return resp;
					} else {
						return caches.match(event.request, cacheOpts);
					}
				} else if (Array.isArray(config.staleFirst) && config.staleFirst.includes(url)) {
					if (navigator.onLine) {
						const cached = await caches.match(event.request, cacheOpts);

						const promise = Promise.all([
							fetch(event.request).catch(console.error),
							caches.open(config.version),
						]).then(([resp, cache]) => {
							if (resp.ok) {
								cache.put(event.request, resp.clone()).catch(console.error);
							}

							return resp;
						});

						if (cached instanceof Response) {
							return cached;
						} else {
							return await promise;
						}
					} else {
						return caches.match(event.request, cacheOpts);
					}
				} else if (Array.isArray(config.allowed) && config.allowed.some(entry => (
					entry instanceof RegExp ? entry.test(url) : url.startsWith(entry)
				))) {
					const resp = await caches.match(event.request, cacheOpts);

					if (resp instanceof Response) {
						return resp;
					} else {
						const resp = await fetch(event.request);

						if (resp instanceof Response) {
							const cpy = resp.clone();
							caches.open(config.version).then(cache => cache.put(event.request, cpy));
							return resp;
						} else {
							console.error(`Failed in request for ${event.request.url}`);
						}
					}
				} else if (Array.isArray(config.allowedFresh) && config.allowedFresh.some(entry => (
					entry instanceof RegExp ? entry.test(url) : url.startsWith(entry)
				))) {
					if (navigator.onLine) {
						const [resp, cache] = await Promise.all([
							fetch(event.request),
							caches.open(config.version),
						]);

						if (resp.ok) {
							cache.put(event.request, resp.clone());
						}

						return resp;
					} else {
						return caches.match(event.request, cacheOpts);
					}
				} else {
					return fetch(event.request);
				}
			})());
		}
	});

	worker.addEventListener('push', async event => {
		const data = event.data.json();
		if (('notification' in data) && Array.isArray(data.notification)
			&& Notification.permission === 'granted') {

			this.registration.showNotification(...data.notification);
		}
	});

	worker.addEventListener('error', console.error);
}
