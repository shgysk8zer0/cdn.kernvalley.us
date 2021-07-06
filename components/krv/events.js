import { text, attr, when } from '../../js/std-js/dom.js';
import { getHTML, getJSON } from '../../js/std-js/http.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { meta } from '../../import.meta.js';

registerCustomElement('krv-events', class HTMLKRVEventsElement extends HTMLElement {
	constructor() {
		super();
		const parent = this.attachShadow({ mode: 'open' });

		Promise.all([
			getHTML(new URL('./components/krv/events.html', meta.url).href),
			loadStylesheet(new URL('./components/krv/events.css', meta.url).href, { parent }),
		]).then(([frag]) => {
			this.shadowRoot.append(frag);
			this.dispatchEvent(new Event('ready'));
		});
	}

	connectedCallback() {
		this.render();
	}

	async render() {
		const [data] = await Promise.all([
			getJSON('https://events.kernvalley.us/events.json'),
			when(this, 'ready'),
		]);

		const tmp = this.shadowRoot.getElementById('event-template').content;
		const events = data.splice(0, this.count).map(({ name, url: href, description, startDate, endDate, location }) => {
			const base = tmp.cloneNode(true);
			const container = document.createElement('div');
			const start = new Date(startDate);
			const end = new Date(endDate);

			container.classList.add('event');

			if ('part' in container) {
				container.part.add('event');
			}

			attr('.event-url', { href }, { base });
			text('.event-name', name, { base });
			text('.event-description', description, { base });
			text('.event-start-time', start.toLocaleString(), { base });
			attr('.event-start-time', { datetime: start.toISOString() }, { base });
			text('.event-end-time', end.toLocaleTimeString(), { base });
			attr('.event-end-time', { datetime: end.toISOString() }, { base });

			if (typeof location !== 'undefined' && location.hasOwnProperty('address')) {
				text('.event-location', location.address.addressLocality, { base });
			}

			container.append(base);
			return container;
		});

		this.shadowRoot.getElementById('events-list').replaceChildren(...events);
	}

	get theme() {
		if (this.hasAttribute('theme')) {
			return this.getAttribute('theme');
		} else {
			return 'auto';
		}
	}

	set theme(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribute('theme');
		}
	}

	get count() {
		if (this.hasAttribute('count')) {
			return parseInt(this.getAttribute('count')) || 5;
		} else {
			return 5;
		}
	}

	set count(val) {
		if (Number.isInteger(val) && val > 0) {
			this.setAttribute('count', val);
		} else {
			this.removeAttribute('count');
		}
	}

	attributeChangedCallback(name/*, oldval, newVal*/) {
		switch(name) {
			case 'count':
				this.render();
				break;

			default:
				console.error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return ['count'];
	}
});
