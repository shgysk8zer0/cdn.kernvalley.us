import { text, attr, when } from '../../js/std-js/dom.js';
import { getHTML } from '../../js/std-js/http.js';
import { getEvents as getAllEvents } from '../../js/std-js/krv/events.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { meta } from '../../import.meta.js';
import { getURLResolver, callOnce, setUTMParams } from '../../js/std-js/utility.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getString, setString, getInt, setInt } from '../../js/std-js/attrs.js';
import { createPolicy } from '../../js/std-js/trust.js';

const policy = createPolicy('krv-events#html', { createHTML: input => input });
export const trustPolicies = [policy.name];
const resolveURL = getURLResolver({ base: meta.url, path: '/components/krv/' });
const getTemplate = callOnce(() => getHTML(resolveURL('events.html'), { policy }));
const getEvents = callOnce(() => getAllEvents());
const protectedData = new WeakMap();

function utm(url, { campaign, content = 'krv-events-el', medium, source, term }) {
	return setUTMParams(url, { campaign, content, medium, source, term }).href;
}

registerCustomElement('krv-events', class HTMLKRVEventsElement extends HTMLElement {
	constructor() {
		super();
		const parent = this.attachShadow({ mode: 'closed' });
		const internals = this.attachInternals();

		Promise.all([
			getTemplate().then(frag => frag.cloneNode(true)),
			loadStylesheet(resolveURL('./events.css'), { parent }),
			this.whenConnected,
		]).then(([frag]) => {
			internals.role = 'document';
			internals.ariaLabel = 'Kern Valley Events Calendar';
			const link = frag.querySelector('.app-link');
			link.target = this.target;

			if (this.hasAttribute('source')) {
				link.href = utm(link.href, this);
			}

			parent.append(frag);
			protectedData.set(this, { shadow: parent, internals });
			this.dispatchEvent(new Event('ready'));
		});
	}

	get ready() {
		if (! protectedData.has(this)) {
			return when(this, 'ready');
		} else {
			return Promise.resolve();
		}
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return when(this, 'connected');
		}
	}

	async connectedCallback() {
		this.dispatchEvent(new Event('connected'));

		if (this.loading === 'lazy') {
			await whenIntersecting(this);
		}

		this.render();
	}

	async render() {
		const now = new Date().toISOString();
		const [data] = await Promise.all([
			getEvents(),
			this.ready,
		]);

		const tmp = protectedData.get(this).shadow.getElementById('event-template').content;
		const { campaign, content, medium, source, term, target } = this;

		const events = data.filter(({ endDate }) => endDate > now)
			.splice(0, this.count)
			.map(({ name, url, description, startDate, endDate, location }) => {
				const base = tmp.cloneNode(true);
				const container = document.createElement('div');
				const start = new Date(startDate);
				const end = new Date(endDate);
				const controller = new AbortController();

				function handler() {
					if (hasGa()) {
						send({
							hitType: 'event',
							eventCategory: 'krv-event',
							eventLabel: this.querySelector('.event-name').textContent,
							eventAction: 'open',
							transport: 'beacon',
						});
					} else {
						controller.abort();
					}
				}

				container.classList.add('event');

				attr('.event-url', { href: utm(url, { campaign, content, medium, source, term}), target }, { base }).forEach(a => {
					a.addEventListener('click', handler, { signal: controller.signal });
				});

				text('.event-name', name, { base });
				text('.event-description', description, { base });
				text('.event-start-time', start.toLocaleString(), { base });
				attr('.event-start-time', { datetime: start.toISOString() }, { base });
				text('.event-end-time', end.toLocaleString(), { base });
				attr('.event-end-time', { datetime: end.toISOString() }, { base });

				if (typeof location !== 'undefined') {
					text('.event-location', location.name || location.address.addressLocality, { base });
				}

				container.append(base);
				return container;
			});

		if (events.length !== 0) {
			protectedData.get(this).shadow.getElementById('events-list').replaceChildren(...events);
		}
	}

	get count() {
		return getInt(this, 'count', { fallback: 5 });
	}

	set count(val) {
		setInt(this, 'count', val);
	}

	get content() {
		return getString(this, 'content', { fallback: 'krv-events' });
	}

	set content(val) {
		setString(this, 'content', val);
	}

	get loading() {
		return getString(this,'loading', { fallback: 'eager' });
	}

	set loading(val) {
		setString(this, 'loading', val);
	}

	get medium() {
		return getString(this, 'medium', { fallback: 'referral' });
	}

	set medium(val) {
		setString(this, 'medium',val);
	}

	get source() {
		return getString(this, 'source');
	}

	set source(val) {
		setString(this, 'source', val);
	}

	get target() {
		return getString(this, 'target', { fallback: '_self' });
	}

	set target(val) {
		setString(this, 'target', val);
	}

	get theme() {
		return getString(this, 'theme', { fallback: 'auto' });
	}

	set theme(val) {
		setString(this, 'theme', val);
	}

	get term() {
		return getString(this, 'term');
	}

	set term(val) {
		setString(this, 'term', val);
	}

	attributeChangedCallback(name/*, oldVal, newVal*/) {
		switch(name) {
			case 'count':
				this.render().catch(console.error);
				break;

			default:
				console.error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return ['count'];
	}
});
