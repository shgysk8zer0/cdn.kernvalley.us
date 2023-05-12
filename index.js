import { loadScript } from 'std-js/loader.js';
import { konami } from '@shgysk8zer0/konami';
import { getDefaultPolicy } from 'std-js/trust-policies.js';
import { createPolicy } from 'std-js/trust.js';
import { alert } from 'std-js/asyncDialog.js';
import '@shgysk8zer0/components/install/prompt.js';

getDefaultPolicy();

const policy = createPolicy('module#script-url', {
	createScriptURL: input => {
		const url = new URL(input, document.baseURI);

		if (['https://cdn.kernvalley.us', location.origin].includes(url.origin)) {
			return url.href;
		} else {
			throw new TypeError(`Untrusted script URL: ${input}`);
		}
	}
});

konami().then(async () => {
	const [{ createElement }, { createLinkExternalIcon, createXIcon }] = await Promise.all([
		import('/js/std-js/elements.js'),
		import('/js/std-js/icons.js'),
	]);

	const tools = [
		{ text: 'Image Tool', href: '/convert/' },
		{ text: 'SRI Generator', href: '/sri/' },
	];

	const dialog = createElement('dialog', {
		events: { close: ({ target }) => target.remove() },
		styles: { width: '80vw' },
		children:[
			createElement('div', {
				styles: { display: 'flex', 'justify-content': 'space-evenly' },
				children: tools.map(({ text, href }) => createElement('a', {
					href,
					target: '_blank',
					role: 'button',
					classList: ['btn', 'btn-primary'],
					children: [
						createElement('span', { text }),
						createLinkExternalIcon({ classList: ['icon'] }),
					]
				}))
			}),
			createElement('div', {
				classList: ['flex', 'space-evenly'],
				children: [
					createElement('button', {
						type: 'button',
						events: { click: ({ target }) => target.closest('dialog').close() },
						classList: ['btn', 'btn-reject'],
						children: [
							createXIcon({ classList: ['icon'] }),
							createElement('span', { text: 'Close' }),
						]
					})
				]
			}),
		]
	});

	document.body.append(dialog);
	dialog.showModal();
});

const modules = [
	'./components/current-year.js',
	'./components/github/user.js',
	'./components/github/repo.js',
	'./components/github/gist.js',
	// './components/ad/block.js',
	// './components/button/share.js',
	'./components/window-controls.js',
	'./components/share-to-button/share-to-button.js',
	'./components/weather/current.js',
	'./components/weather/forecast.js',
	'./components/leaflet/map.js',
	'./components/leaflet/marker.js',
	'./components/app/list-button.js',
	'./components/app/stores.js',
	// './components/notification/html-notification.js',
	'./js/std-js/theme-cookie.js',
	'./components/krv/ad.js',
	'./components/loading-spinner.js',
	'./components/codepen-embed.js',
	'./components/button/share.js',
];

Promise.all([
	navigator.serviceWorker.register(policy.createScriptURL('/sw.js')).catch(console.error),
	...modules.map(src => loadScript(policy.createScriptURL(src), { type: 'module', referrerPolicy: 'no-referrer' }))
]).catch(alert);
