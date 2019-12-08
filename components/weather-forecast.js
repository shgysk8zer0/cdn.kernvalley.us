const shadows = new Map();
const ENDPOINT = 'https://api.openweathermap.org';
const VERSION = 2.5;

async function getForecaseByPostalCode(appId, postalCode, {units = 'imperial', country = 'us', lang = 'en'} = {}) {
	const url = new URL(`/data/${VERSION}/forecast`, ENDPOINT);
	url.searchParams.set('appid', appId);
	url.searchParams.set('zip', `${postalCode},${country}`);
	url.searchParams.set('units', units);
	url.searchParams.set('lang', lang);

	const resp = await fetch(url, {
		headers: new Headers({Accept: 'application/json'}),
		mode: 'cors',
		credentials: 'omit',
	});

	if (resp.ok) {
		return await resp.json();
	} else {
		throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
	}
}

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
			const forecast = await getForecaseByPostalCode(this.appId, this.postalCode);
			console.info(forecast);
		});
	}

	async connectedCallback() {

	}

	get appId() {
		return this.getAttribute('appid');
	}

	set appid(val) {
		this.setAttribute('appid', val);
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
