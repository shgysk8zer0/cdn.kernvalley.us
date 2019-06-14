const config = {
	version: 'kernvalley',
	caches: [
		// Main assets
		'/',
	],
	ignored: [
		'/service-worker.js',
		'/manifest.json',
	],
	paths: [
		'/js/',
		'/css/',
		'/img/',
		'/fonts/',
		'/posts/',
		'/contact/',
	],
	hosts: [
		'secure.gravatar.com',
		'i.imgur.com',
		'cdn.polyfill.io',
	],
};

addEventListener('install', async () => {
	const cache = await caches.open(config.version);
	await cache.addAll(config.caches);
	skipWaiting();

});

addEventListener('activate', event => {
	event.waitUntil(async function() {
		clients.claim();
	}());
});

addEventListener('fetch', async event => {
	function isValid(req) {
		try {
			const url = new URL(req.url);
			const isGet = req.method === 'GET';
			const allowedHost = config.hosts.includes(url.host);
			const isHome = ['/', '/index.html', '/index.php'].some(path => url.pathname === path);
			const notIgnored = config.ignored.every(path => url.pathname !== path);
			const allowedPath = config.paths.some(path => url.pathname.startsWith(path));

			return isGet && (allowedHost || (isHome || (allowedPath && notIgnored)));
		} catch(err) {
			console.error(err);
			return false;
		}
	}

	async function get(request) {
		const cache = await caches.open(config.version);
		const cached = await cache.match(request);

		if (navigator.onLine) {
			const fetched = fetch(request).then(async resp => {
				if (resp instanceof Response && resp.ok) {
					const respClone = await resp.clone();
					await cache.put(event.request, respClone);
				}
				return resp;
			});

			if (cached instanceof Response) {
				return cached;
			} else {
				const resp = await fetched;
				return resp;
			}
		} else {
			return cached;
		}
	}

	if (isValid(event.request)) {
		// console.log(event.request.url);
		event.respondWith(get(event.request));
	}
});
