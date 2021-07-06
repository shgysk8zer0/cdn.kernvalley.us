import { text, attr } from '../../js/std-js/dom.js';
import { getHTML, getJSON } from '../../js/std-js/http.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { meta } from '../../import.meta.js';

registerCustomElement('krv-events', class HTMLKRVEventsElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	async connectedCallback() {
		const [base, data] = await Promise.all([
			getHTML(new URL('./components/krv/events.html', meta.url).href),
			getJSON('https://events.kernvalley.us/events.json'),
		]);

		const tmp = base.getElementById('event-template').content;

		attr('link[rel="stylesheet"]', { href: new URL('./components/krv/events.css', meta.url).href }, { base });
		this.shadowRoot.append(base);
		const events = data.map(({ name, url: href, description, startDate, endDate, location }) => {
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

		this.shadowRoot.append(...events);
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
});
