import { meta } from '../../../import.meta.js';
import {shadows, clearSlot, clearSlots, getForecastByPostalCode, createIcon, getSprite} from './helper.js';
import HTMLCustomElement from '../custom-element.js';

HTMLCustomElement.register('weather-forecast', class HTMLWeatherForecastElement extends HTMLElement {
	constructor({ appId = null, postalCode = null } = {}) {
		super();

		Promise.resolve(this.attachShadow({mode: 'closed'})).then(async shadow => {
			if (typeof appId === 'string') {
				this.appId = appId;
			}

			if (typeof postalCode === 'string' || typeof postalCode === 'number') {
				this.postalCode = postalCode;
			}

			const resp = await fetch(new URL('./components/weather/forecast.html', meta.url));
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
		this.dispatchEvent(new Event('connected'));
		await this.ready;
		this.update();
	}

	get appId() {
		return this.getAttribute('appid');
	}

	set appId(val) {
		if (typeof val === 'string') {
			this.setAttribute('appid', val);
		} else {
			this.removeAttribute('appid');
		}
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

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true }));
		}
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

			case 'theme':
				this.dispatchEvent(new CustomEvent('themechange', {detail: {oldValue, newValue}}));
				break;

			case 'units':
				this.dispatchEvent(new CustomEvent('unitschange', {detail: {oldValue, newValue}}));
				break;

			default: throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	async update() {
		const {city, forecast} = await getForecastByPostalCode(this.appId, this.postalCode);
		await this.ready;
		this.city = city.name;
		const shadow = shadows.get(this);
		const days = Object.values(forecast).map((day, i) => {
			i++;
			clearSlots(this, `high${i}`, `low${i}`, `date${i}`, `icon${i}`, `summary${i}`).then(() => {
				const high = document.createElement('span');
				const low = document.createElement('span');
				const date = document.createElement('time');
				const icon = createIcon(getSprite(day.icon), shadow);
				const summary = document.createElement('b');
				summary.slot = `summary${i}`;
				summary.textContent = day.conditions;
				icon.slot = `icon${i}`;
				date.textContent = day.date.toLocaleDateString();
				date.dateTime = day.date.toISOString();
				date.slot = `date${i}`;
				high.slot = `high${i}`;
				low.slot = `low${i}`;
				high.textContent = Math.round(day.high);
				low.textContent = Math.round(day.low);
				this.append(date, icon, summary, high, low);
			});

			const el = document.createElement('b');

			el.slot = `dow${i}`;
			el.textContent = day.dow;
			return el;
		});
		await clearSlots(this, 'dow1', 'dow2', 'dow3', 'dow4', 'dow5');
		this.append(...days);
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
