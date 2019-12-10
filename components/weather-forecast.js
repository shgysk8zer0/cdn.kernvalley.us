import {shadows, clearSlot, getForecastByPostalCode} from './weather-helper.js';
// @TODO update
// This has mostly been moved to <weather-current>

customElements.define('weather-forecast', class HTMLWeatherForecastElement extends HTMLElement {
	constructor() {
		super();
		const url = new URL(location.href);

		if (url.searchParams.has('postalcode')) {
			this.postalCode = url.searchParams.get('postalcode');
		}

		Promise.resolve(this.attachShadow({mode: 'closed'})).then(async shadow => {
			const resp = await fetch(new URL('weather-forecast.html', import.meta.url));
			const html = await resp.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			shadow.append(...doc.head.children, ...doc.body.children);
			shadows.set(this, shadow);
			this.dispatchEvent(new Event('ready'));
		});

		this.ready.then(async () => {
			const forecast = await getForecastByPostalCode(this.appId, this.postalCode);
			this.city = forecast.city.name;
			console.info(forecast);
		});
	}

	async connectedCallback() {
		//
	}

	get appId() {
		return this.getAttribute('appid');
	}

	set appid(val) {
		this.setAttribute('appid', val);
	}

	set city(val) {
		const el = document.createElement('span');
		el.textContent = val;
		el.slot = 'city';
		clearSlot(this, 'city').then(() => this.append(el));
	}

	get postalCode() {
		return this.getAttribute('postalcode');
	}

	set postalCode(val) {
		this.setAttribute('postalcode', val);
	}

	get ready() {
		return new Promise(resolve => {
			if (shadows.has(this)) {
				resolve();
			} else {
				this.addEventListener('ready', () => resolve(), {once: true});
			}
		});
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		await this.ready;
		switch(name) {
		case 'appid':
			this.dispatchEvent(new CustomEvent('appidchange', {detail: {oldValue, newValue}}));
			break;
		case 'postalcode':
			this.dispatchEvent(new CustomEvent('locationchange', {detail: {oldValue, newValue}}));
			break;

		case 'units':
			this.dispatchEvent(new CustomEvent('unitschange', {detail: {oldValue, newValue}}));
			break;
		default: throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'appid',
			'postalcode',
			'units',
		];
	}
});
