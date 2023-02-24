import { createScript, createLink } from '/js/std-js/elements.js';
import { hash, SRI } from '/js/std-js/hash.js';
import { text, enable, disable } from '/js/std-js/dom.js';
import { JS, CSS, HTML } from '/js/std-js/types.js';

async function getIntegrity(resp, data) {
	if (! resp.ok) {
		throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
	} else if (data.get('type') === 'script' && ! resp.headers.get('Content-Type').toLowerCase().startsWith(JS)) {
		throw new TypeError(`Expected a script but got ${resp.headers.get('Content-Type')}`);
	} else if (data.get('type') === 'stylesheet' && ! resp.headers.get('Content-Type').toLowerCase().startsWith(CSS)) {
		throw new TypeError(`Expected a script but got ${resp.headers.get('Content-Type')}`);
	} else if (data.get('type') === 'document' && ! resp.headers.get('Content-Type').toLowerCase().startsWith(HTML)) {
		throw new TypeError(`Expected an HTML Document but got ${resp.headers.get('Content-Type')}`);
	} else if (data.get('type') === 'image' && ! resp.headers.get('Content-Type').toLowerCase().startsWitH('image/')) {
		throw new TypeError(`Expected an image but got a ${resp.headers.get('Content-Type')}`);
	} else {
		return await hash(await resp.text(), { algorithm: data.get('algo'), output: SRI });
	}
}

function createRequest(data) {
	const url = new URL(data.get('url'));
	const opts = {
		referrerPolicy: data.get('referrerPolicy'),
		headers: new Headers(),
	};

	switch(data.get('type')) {
		case 'script':
			opts.headers.set('Accept', JS);
			break;

		case 'stylesheet':
			opts.headers.set('Accept', CSS);
			break;

		case 'document':
			opts.headers.set('Accept', HTML);
			break;
	}

	return new Request(url, opts);
}

function updateForm() {
	const script = document.getElementById('script-opts');
	const style = document.getElementById('style-opts');
	const preload = document.getElementById('preload').checked;
	const type = document.getElementById('type').value;
	script.hidden = preload || type !== 'script';
	script.disabled = preload || type !== 'script';
	style.hidden = type !== 'stylesheet';
	style.disabled = type !== 'stylesheet';

	document.querySelectorAll('option.preload-enable').forEach(opt => {
		opt.disabled = ! preload;
	});
}

async function generateSRIHash(data) {
	const req = createRequest(data);
	const resp = await fetch(req);
	const integrity = await getIntegrity(resp, data);

	switch(data.get('type')) {
		case 'script': {
			const script = createScript(data.get('url'),  {
				crossOrigin: data.get('crossOrigin'),
				referrerPolicy: data.get('referrerPolicy'),
				defer: data.has('defer'),
				async: data.has('async'),
				noModule: data.has('noModule'),
				type: data.get('script-type'),
				fetchPriority: data.get('fetchPriority'),
				integrity,
			});

			if (! script.hasAttribute('fetchpriority')) {
				script.setAttribute('fetchpriority', data.get('fetchPriority'));
			}

			return script.outerHTML;
		}

		case 'stylesheet': {
			const link = createLink(data.get('url'),  {
				rel: ['stylesheet'],
				crossOrigin: data.get('crossOrigin'),
				referrerPolicy: data.get('referrerPolicy'),
				media: data.get('media'),
				fetchPriority: data.get('fetchPriority'),
				integrity,
			});

			if (! link.hasAttribute('fetchpriority')) {
				link.setAttribute('fetchpriority', data.get('fetchPriority'));
			}

			return link.outerHTML;
		}

		default:
			throw new DOMException(`Type must be "script" or "stylesheet". Got ${data.get('type')}`);
	}
}

async function generatePreload(data) {
	const req = createRequest(data);
	const resp = await fetch(req);
	const integrity = await getIntegrity(resp, data);
	const link = createLink(data.get('url'), {
		rel: ['preload'],
		crossOrigin: data.get('crossOrigin'),
		referrerPolicy: data.get('referrerPolicy'),
		fetchPriority: data.get('fetchPriority'),
		media: data.has('media') ? data.get('media') : null,
		integrity,
	});

	switch(data.get('type')) {
		case 'script':
			link.as = 'script';
			link.type = JS;
			break;

		case 'stylesheet':
			link.as = 'style';
			link.type = CSS;
			break;

		case 'document':
			link.as = 'document';
			link.type = HTML;
			break;

		case 'image':
			link.as = 'image';
			link.type = resp.headers.get('Content-Type').split(';')[0];
			break;

		case 'font':
			link.as = 'font';
			link.type = resp.headers.get('Content-Type').split(';')[0];
			break;

		case 'fetch':
			link.as = 'fetch';
			link.type = resp.headers.get('Content-Type').split(';')[0];
			break;
	}

	if (! link.hasAttribute('fetchpriority')) {
		link.setAttribute('fetchpriority', data.get('fetchPriority'));
	}

	return link.outerHTML;
}

document.forms.sri.addEventListener('submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);

	try {
		const result = data.has('preload')
			? await generatePreload(data)
			: await generateSRIHash(data);

		text('#output', result);
		text('#error', '');
		enable('#copy');
	} catch(err) {
		text('#error', err);
		text('#output', '');
		disable('#copy');
	}
});

document.forms.sri.reset();

document.forms.sri.addEventListener('reset', () => {
	text('#output', '');
	text('#error', '');
	disable('#copy');
});

document.getElementById('type').addEventListener('change', updateForm);
document.getElementById('preload').addEventListener('change', updateForm);

document.getElementById('copy').addEventListener('click', () => {
	navigator.clipboard.writeText(document.getElementById('output').textContent);
});
