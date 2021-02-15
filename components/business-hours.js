import { registerCustomElement, on } from 'https://cdn.kernvalley.us/js/std-js/custom-elements.js';
import { days } from 'https://cdn.kernvalley.us/js/std-js/date-consts.js';

const dayNames = days.map(({ name }) => name.toLowerCase());

function hasHours(parent) {
	return Array.from(parent.querySelectorAll('slot'))
		.every(slot => slot.assignedElements().length === 1);
}

registerCustomElement('business-hours', class HTMLBusinessHoursElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		const data = document.createElement('slot');
		data.name = 'data';
		on(data, 'slotchange', ({ target }) => {
			if (target.assignedElements().length === 1) {
				this.setOpeningHoursSpecification(target.assignedElements()[0]);
			}
		});

		this.shadowRoot.append(data, ...days.map(({ name, short }) => {
			const container = document.createElement('div');
			const opens = document.createElement('slot');
			const closes = document.createElement('slot');
			const day = document.createElement('b');
			const sep = document.createElement('span');
			container.hidden = true;
			sep.textContent = '—';
			opens.classList.add('open-time');
			closes.classList.add('close-time');
			container.classList.add('business-day');
			container.dataset.dow = name.toLowerCase();

			try {
				container.part.add('day', name.toLowerCase());
				day.part.add('dow');
				opens.part.add('opens');
				closes.part.add('closes');
			} catch(err) {
				console.error(err);
			}

			day.textContent = `${short}: `;
			opens.name = `opens-${name.toLowerCase()}`;
			closes.name = `closes-${name.toLowerCase()}`;
			container.append(day, opens, sep, closes);

			on([opens, closes], 'slotchange', ({ target: { parentElement }}) => {
				if (typeof this.day !== 'string') {
					parentElement.hidden = ! hasHours(parentElement);
				}
			});

			return container;
		}));
	}

	connectedCallback() {
		this.setAttribute('itemtype', 'https://schema.org/OpeningHoursSpecification');
		this.setAttribute('itemscope', '');

		if (this.todayOnly) {
			this.day = days[new Date().getDay()].name.toLowerCase();
		}
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'day':
				if (typeof newVal === 'string' && dayNames.includes(newVal)) {
					this.shadowRoot.querySelectorAll('[data-dow]').forEach(el => {
						el.hidden = el.dataset.dow !== newVal;
					});
				} else {
					this.shadowRoot.querySelectorAll('[data-dow]').forEach(el => {
						el.hidden = false;
					});
				}
				break;
		}
	}

	setOpeningHoursSpecification(openingHoursSpecification) {
		if (openingHoursSpecification instanceof HTMLScriptElement) {
			this.setOpeningHoursSpecification(JSON.parse(openingHoursSpecification.text));
		} else if (Array.isArray(openingHoursSpecification)) {
			const hrs = openingHoursSpecification.map(({ opens, closes, dayOfWeek } = {}) => {
				if (typeof opens === 'string' && typeof closes === 'string' && typeof dayOfWeek === 'string') {
					opens = opens.replace('T', '');
					closes = closes.replace('T', '');
					const link = document.createElement('link');
					dayOfWeek = dayOfWeek.replace('https://schema.org/', '')
						.replace('http://schema.org/', '');
					const [openHr, openMin] = opens.replace('T', '').split(':', 2).map(n => parseInt(n));
					const [closeHr, closeMin] = closes.replace('T', '').split(':', 2).map(n => parseInt(n));
					const openTime = document.createElement('time');
					const closeTime = document.createElement('time');
					const openAmPm = openHr < 12 ? 'AM' : 'PM';
					const closeAmPm = closeHr < 12 ? 'AM' : 'PM';

					openTime.dateTime = `T${opens}`;
					openTime.textContent = `${openHr % 12}:${openMin.toString().padEnd(2, '0')} ${openAmPm}`;
					closeTime.textContent = `${closeHr % 12}:${closeMin.toString().padEnd(2, '0')} ${closeAmPm}`;
					closeTime.dateTime = `T${closes}`;


					openTime.slot = `opens-${dayOfWeek.toLowerCase()}`;
					openTime.setAttribute('itemprop', 'opens');
					closeTime.slot = `closes-${dayOfWeek.toLowerCase()}`;
					closeTime.setAttribute('itemprop', 'closes');
					link.setAttribute('itemprop', 'dayOfWeek');
					link.href = new URL(dayOfWeek, 'https://schema.org/').href;

					return [link, openTime, closeTime];
				}
			});

			this.replaceChildren(...hrs.flat());
		}
	}

	get todayOnly() {
		return this.hasAttribute('todayonly');
	}

	set todayOnly(val) {
		this.toggleAttribute('todayonly', val);
	}

	get day() {
		return this.getAttribute('day');
	}

	set day(val) {
		const day = val.toLowerCase();
		if (days.find(({ name }) => name.toLowerCase() === day)) {
			this.setAttribute('day', day);
		} else {
			this.removeAttribute('day');
		}
	}

	static get observedAttributes() {
		return ['day'];
	}
});
