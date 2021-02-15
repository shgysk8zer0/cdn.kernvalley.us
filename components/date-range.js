import { registerCustomElement } from '../js/std-js/custom-elements.js';

registerCustomElement('date-range', class HTMLDateRangeElement extends HTMLElement {
	get start() {
		if (this.hasAttribute('start')) {
			const val = new Date(this.getAttribute('start'));
			return Number.isNaN(val) ? null : val;
		} else {
			return null;
		}
	}

	set start(val) {
		if (! (val instanceof Date)) {
			val = new Date(val);
		}

		if (Number.isNaN(val.getDate())) {
			throw new Error('Invalid date given');
		} else {
			this.setAttribute('start', val.toISOString());
		}
	}

	get end() {
		if (this.hasAttribute('end')) {
			const val = new Date(this.getAttribute('end'));
			return Number.isNaN(val) ? null : val;
		} else {
			return null;
		}
	}

	set end(val) {
		if (! (val instanceof Date)) {
			val = new Date(val);
		}

		if (Number.isNaN(val.getDate())) {
			throw new Error('Invalid date given');
		} else {
			this.setAttribute('end', val.toISOString());
		}
	}

	get date() {
		if (this.hasAttribute('date')) {
			const val = new Date(this.getAttribute('date'));
			return Number.isNaN(val) ? null : val;
		} else {
			return new Date();
		}
	}

	set date(val) {
		if (! (val instanceof Date)) {
			val = new Date(val);
		}

		if (Number.isNaN(val.getDate())) {
			throw new Error('Invalid date given');
		} else {
			this.setAttribute('date', val.toISOString());
		}
	}

	get inRange() {
		const {start, end, date} = this;
		return ((end === null || end >= date) && (start === null || start <= date));
	}

	attributeChangedCallback(name) {
		switch (name) {
			case 'date':
			case 'end':
			case 'start':
				this.hidden = ! this.inRange;
				break;

			default: throw new Error(`Invalid attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'end',
			'date',
			'start',
		];
	}
});
