/* eslint-env serviceworker */
/* global init */

self.importScripts('/service-worker.js');

init(self, {
	version: '1.0.0',
	fresh: [
		new URL('/', location.origin).href
	],
	allowedFresh: [
		/\.(jpg|png|gif|webp|svg|woff2|woff)$/,
		/\.(js|css|html|json)$/,
	]
});
