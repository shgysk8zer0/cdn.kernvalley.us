import { registerCustomElement } from '../js/std-js/functions.js';

registerCustomElement('browser-switch', class HTMLBrowserSwitchElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({mode: 'closed'});
		const chrome = document.createElement('slot');
		const firefox = document.createElement('slot');
		const edge = document.createElement('slot');
		const edgeChromium = document.createElement('slot');
		const safari = document.createElement('slot');
		const ie = document.createElement('slot');
		const unknown = document.createElement('slot');
		const show = this.browser.slot;

		chrome.name = 'chrome';
		chrome.hidden = true;
		firefox.name = 'firefox';
		firefox.hidden = true;
		edge.name = 'edge';
		edge.hidden = true;
		edgeChromium.name = 'edge-chromium';
		edgeChromium.hidden = true;
		safari.name = 'safari';
		safari.hidden = true;
		ie.name = 'ie';
		ie.hidden = true;
		unknown.name = 'unknown';
		unknown.hidden = true;

		shadow.append(chrome, edge, edgeChromium, safari, firefox, ie, unknown);

		for (const slot of [...shadow.querySelectorAll('slot[name]')]) {
			if (slot.name === show) {
				requestAnimationFrame(() => {
					slot.hidden = false;
					slot.assignedNodes().forEach(el => el.hidden = false);
				});
				break;
			}
		}
	}

	get browser() {
		const found = HTMLBrowserSwitchElement.patterns.find(({pattern}) => pattern.test(navigator.userAgent));
		return typeof found === 'undefined' ? {
			browser: 'Unknown',
			pattern: null,
			slot: 'unknown',
		} : found;
	}

	static get patterns() {
		return [{
			browser: 'Edge-Chromium',
			pattern: /EdgA?\/\d{1,}(\.\d{1,3}){1,4}/,
			slot: 'edge-chromium'
		}, {
			browser: 'Chrome',
			pattern: /Chrome\/\d{1,}(\.\d{1,3}){1,4}/,
			slot: 'chrome',
		}, {
			browser: 'Firefox',
			pattern: /Firefox\/\d{1,}\.\d{1,3}/,
			slot: 'firefox',
		}, {
			browser: 'Safari',
			pattern: /AppleWebKit\/\d{1,}\.\d+/,
			slot: 'safari',
		}, {
			browser: 'Internet Explorer',
			pattern: /Trident\/\d{1,2}\.\d+/,
			slot: 'ie',
		}];
	}
});

