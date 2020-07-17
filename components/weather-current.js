import { meta } from '../../import.meta.js';
import {shadows, clearSlot, getWeatherByPostalCode, createIcon, getIcon, getSprite} from './weather-helper.js';
import HTMLCustomElement from './custom-element.js';

HTMLCustomElement.register('weather-current', class HTMLWeatherForecastElement extends HTMLElement {
	constructor() {
		super();
		const url = new URL(location.href);

		if (url.searchParams.has('postalcode')) {
			this.postalCode = url.searchParams.get('postalcode');
		}

		Promise.resolve(this.attachShadow({mode: 'closed'})).then(async shadow => {
			const resp = await fetch(new URL('./components/weather-current.html', meta.url));
			const html = await resp.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			doc.querySelectorAll('link[href]').forEach(link => link.href = new URL(link.getAttribute('href'), resp.url));
			shadow.append(...doc.head.children, ...doc.body.children);
			shadows.set(this, shadow);
			this.dispatchEvent(new Event('ready'));
		});
	}

	async connectedCallback() {
		this.update(this);
	}

	async update() {
		this.ready.then(async () => {
			const {name, main, wind, dt, weather} = await getWeatherByPostalCode(this.appId, this.postalCode);
			this.city = name;
			this.temp = main.temp;
			this.conditions = weather[0].description;
			this.windSpeed = wind.speed;
			this.icon = createIcon(getSprite(weather[0].icon), shadows.get(this));
			this.updated = dt;
		});
	}

	get appId() {
		return this.getAttribute('appid');
	}

	set appid(val) {
		this.setAttribute('appid', val);
	}

	set city(val) {
		this._set('city', val);
	}

	set icon(val) {
		if (typeof val === 'string') {
			const icon = getIcon(val);
			console.info(val);
			clearSlot(this, 'icon').then(() => this.append(icon));
		} else if (val instanceof Element) {
			val.slot = 'icon';
			clearSlot(this, 'icon').then(() => this.append(val));
		}
	}

	set sprite(symbol) {
		this.icon = createIcon(symbol, shadows.get(this));
	}

	set temp(val) {
		this._set('temp', Math.round(val));
	}

	set updated(val) {
		if (typeof val === 'number' || typeof val === 'string') {
			// Convert to ms if int
			const date = new Date(Number.isInteger(val) ? val * 1000 : val);
			const el = document.createElement('time');
			el.textContent = date.toLocaleTimeString();
			el.dateTime = date.toISOString();
			el.slot = 'updated';
			clearSlot(this, 'updated').then(() => this.append(el));
		} else if (val instanceof HTMLElement) {
			val.slot = 'updated';
			clearSlot(this, 'updated').then(() => this.append(val));
		}
	}

	set windSpeed(val) {
		this._set('windSpeed', val);
	}

	set conditions(val) {
		this._set('conditions', val);
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

	get theme() {
		return this.getAttribute('theme') || 'auto';
	}

	set theme(val) {
		switch(val.toLowerCase()) {
			case 'light':
				this.setAttribute('theme', 'light');
				break;

			case 'dark':
				this.setAttribute('theme', 'dark');
				break;

			case '':
			case 'auto':
				this.removeAttribute('theme');
				break;

			default:
				throw new Error(`Unsupported theme: ${val}`);
		}
	}

	async _set(name, value, {tag = 'span', attrs = {}} = {}) {
		const el = document.createElement(tag);
		el.slot = name;
		el.textContent = value;
		Object.entries(attrs).forEach(({key, val}) => el.setAttribute(key, val));
		await clearSlot(this, name);
		this.append(el);
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
			case 'appid':
				this.dispatchEvent(new CustomEvent('appidchange', {detail: {oldValue, newValue}}));
				break;

			case 'postalcode':
				this.dispatchEvent(new CustomEvent('locationchange', {detail: {oldValue, newValue}}));
				break;

			case 'theme':
				this.dispatchEvent(new CustomEvent('themechange', {detail: {oldValue, newValue}}));
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
			'theme',
		];
	}
});
