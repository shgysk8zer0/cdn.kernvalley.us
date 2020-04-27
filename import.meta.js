const url = import.meta.url.endsWith('.min.js')
	? new URL('https://cdn.kernvalley.us').href
	: new URL(import.meta.url).href;

export const meta = { url };
