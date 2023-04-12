import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createElement } from '../../js/std-js/elements.js';
import { createStarIcon } from '../../js/std-js/icons.js';
import { getInt, setInt, getColor, setColor } from '../../js/std-js/attrs.js';
import { HTMLCustomInputElement } from './custom-input.js';

const protectedData = new WeakMap();

function getContainer(el) {
	return protectedData.get(el).shadow.firstElementChild;
}

function getStars(el) {
	return getContainer(el).querySelectorAll('.star');
}

function setStarRating(event) {
	if (event.type === 'click' || (event.type === 'keydown' && event.keyCode === 13)) {
		event.currentTarget.parentElement.parentNode.host.value = event.currentTarget.dataset.value;
	}
}

function createStars(qty, { size, fill, value = 0 } = {}) {
	return Array.from({ length: qty }).map((_, i) => createStarIcon({
		size,
		fill: (i + 1) <= value ? fill : 'none',
		stroke: fill,
		title: `${i + 1} stars`,
		tabindex: 0,
		role: 'button',
		'stroke-width': 2,
		dataset: { value: i + 1 },
		classList: ['star'],
		part: ['star'],
		events: {
			click: setStarRating,
			keydown: setStarRating,
		}
	}));
}

async function updateFill(el) {
	await el.ready;
	const color = el.fill;

	getStars(el).forEach(star => {
		star.setAttribute('stroke', color);
		if (star.classList.contains('checked')) {
			star.setAttribute('fill', color);
		}
	});
}

async function setValue(el) {
	await el.ready;
	const { internals } = protectedData.get(el);
	const { max, min, value, fill, required } = el;

	if (Number.isNaN(value)) {
		internals.setValidity({ badInput: true }, 'Please provide a valid number for value', el);
	} else if (value === 0 && required) {
		internals.setValidity({ valueMissing: true }, 'Please select a star rating.', el);
	} else if (value > max) {
		internals.setValidity({ rangeOverflow: true }, `Please select a rating between ${min} and ${max}.`, el);
	} else if (value < min) {
		internals.setValidity({ rangeUnderflow: true }, `Please select a rating between ${min} and ${max}.`, el);
	} else {
		internals.setFormValue(value, value);
		internals.setValidity({}, '');
		internals.ariaValueNow = `${value}`;
		internals.ariaValueText = `${value} stars`;
		getStars(el).forEach((star, i) => {
			if (i < value) {
				star.classList.add('checked');
				star.setAttribute('fill', fill);
			} else {
				star.classList.remove('checked');
				star.setAttribute('fill', 'none');
			}
		});
	}
}

registerCustomElement('star-rating', class HTMLStarRatingElement extends HTMLCustomInputElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const internals = this.attachInternals();
		internals.ariaLabel = 'Star Rating';
		shadow.append(createElement('div', { part: ['container'] }));
		protectedData.set(this, { shadow, internals });
	}

	get fill() {
		return getColor(this, 'fill') || 'currentColor';
	}

	set fill(val) {
		setColor(this, 'fill', val);
	}

	get max() {
		return getInt(this, 'max', { min: 0, fallback: 5 });
	}

	set max(val) {
		setInt(this, 'max', val, { min: 0 });
	}

	get min() {
		return 0;
	}

	get ready() {
		return new Promise(resolve => {
			if (this.isConnected) {
				resolve();
			} else {
				this.addEventListener('connected', () => resolve(), { once: true });
			}
		});
	}

	get size() {
		return getInt(this, 'size', { fallback: 18, min: 0 });
	}

	set size(val) {
		setInt(this, 'size', val, { min: 0 });
	}

	get value() {
		return getInt(this, 'value', { min: 0, max: this.max, fallback: 0 });
	}

	set value(val) {
		setInt(this, 'value', val, { min: 0, max: this.max });
	}

	connectedCallback() {
		super.connectedCallback();
		const { internals } = protectedData.get(this);
		const { max, value, fill, size } = this;
		internals.ariaValueMin = '0';
		internals.role = 'slider';

		if (! this.hasAttribute('max')) {
			internals.ariaValueMax = `${max}`;
			getContainer(this).replaceChildren(...createStars(max, { fill, size, value }));
		}

		if (! this.hasAttribute('value')) {
			this.value = 0;
		}

		this.dispatchEvent(new Event('connected'));
	}
	
	formResetCallback() {
		this.value = this.min;
	}

	formStateRestoreCallback(state) {
		this.value = state;
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'fill':
				updateFill(this);
				break;

			case 'max':
				this.ready.then(() => {
					const { max, fill, size } = this;
					protectedData.get(this).internals.ariaValueMax = `${max}`;
					getContainer(this).replaceChildren(...createStars(max, { fill, size, max }));
				});
				break;

			case 'size':
				this.ready.then(() => {
					const size = this.size;
					getStars(this).forEach(star => {
						star.setAttribute('height', size);
						star.setAttribute('width', size);
					});
				});
				break;

			case 'value':
				setValue(this);
				break;

			default:
				super.attributeChangedCallback(name, oldVal, newVal);
		}
	}

	increment() {
		if (this.value < this.max) {
			this.value++;
		}
	}

	decrement() {
		if (this.value !== 0) {
			this.value--;
		}
	}

	static get observedAttributes() {
		return [...HTMLCustomInputElement.observedAttributes, 'max', 'value', 'fill', 'size'];
	}
});
