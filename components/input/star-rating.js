import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createElement } from '../../js/std-js/elements.js';
import { createStarIcon } from '../../js/std-js/icons.js';
import { getInt, setInt, getColor, setColor } from '../../js/std-js/attrs.js';
import { HTMLCustomInputElement, STATES } from './custom.js';

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

function createStars(qty, { size, fill, stroke, strokeWidth, value = 0 } = {}) {
	return Array.from({ length: qty }).map((_, i) => createStarIcon({
		size,
		fill: (i + 1) <= value ? fill : 'none',
		stroke: stroke,
		title: `${i + 1} stars`,
		tabindex: 0,
		role: 'button',
		'stroke-width': strokeWidth,
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
		if (star.classList.contains('checked')) {
			star.setAttribute('fill', color);
		}
	});
}

async function updateStroke(el) {
	await el.ready;
	const color = el.stroke;
	getStars(el).forEach(star => star.setAttribute('stroke', color));
}

async function updateStrokeWidth(el) {
	await el.ready;
	const width = el.strokeWidth;
	getStars(el).forEach(star => star.setAttribute('stroke-width', width));
}

async function setValue(el) {
	await el.ready;
	const { internals } = protectedData.get(el);
	const { max, min, value, fill, required } = el;

	if (Number.isNaN(value)) {
		internals.setValidity({ badInput: true }, 'Please provide a valid number for value', getContainer(el));
	} else if (value === 0 && required) {
		internals.setValidity({ valueMissing: true }, 'Please select a star rating.', getContainer(el));
	} else if (value > max) {
		internals.setValidity({ rangeOverflow: true }, `Please select a rating between ${min} and ${max}.`, getContainer(el));
	} else if (value < min) {
		internals.setValidity({ rangeUnderflow: true }, `Please select a rating between ${min} and ${max}.`, getContainer(el));
	} else {
		internals.setFormValue(value, value);
		internals.setValidity({}, '');
		internals.ariaValueNow = `${value}`;
		internals.ariaValueText = `${value} out of ${max} stars`;
		el.dispatchEvent(new Event('change'));

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

	if (internals.validity.valid) {
		internals.states.add(STATES.valid);
		internals.states.delete(STATES.invalid);
	} else {
		internals.states.add(STATES.invalid);
		internals.states.delete(STATES.valid);
	}
}

registerCustomElement('star-rating', class HTMLStarRatingElement extends HTMLCustomInputElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const internals = this.attachInternals();
		shadow.append(createElement('div', { part: ['container'], aria: { role: 'group' }}));
		protectedData.set(this, { shadow, internals });
		this.addEventListener('accessibleincrement', this.increment);
		this.addEventListener('accessibledecrement', this.decrement);
		this.addEventListener('keydown', event => {
			switch(event.keyCode) {
				case 38: // ↑
				case 107: // +
					event.preventDefault();
					event.target.increment();
					break;

				case 40: // ↓
				case 109: // -
					event.preventDefault();
					event.target.decrement();
					break;

				case 49: // 1-9
				case 50:
				case 51:
				case 52:
				case 53:
				case 54:
				case 55:
				case 56:
				case 57:
					this.value = Math.min((event.keyCode - 48), this.max);
					break;
				case 48: // 0 = 10
					this.value = Math.min(10, this.max);
					break;

				case 97: // 0-9 (numeric keypad)
				case 98:
				case 99:
				case 100:
				case 101:
				case 102:
				case 103:
				case 104:
				case 105:
					this.value = Math.min((event.keyCode - 96), this.max);
					break;

				case 96: // 0 = 10 (numeric keypad)
					this.value = Math.min(10, this.max);
					break;
			}
		});
	}

	get fill() {
		return getColor(this, 'fill') || 'currentColor';
	}

	set fill(val) {
		setColor(this, 'fill', val);
	}

	get max() {
		return getInt(this, 'max', { min: 0, max: 10, fallback: 5 });
	}

	set max(val) {
		setInt(this, 'max', val, { min: 0, max: 10 });
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

	get stroke() {
		return getColor(this, 'stroke') || this.fill;
	}

	set stroke(val) {
		setColor(this, 'stroke', val);
	}

	get strokeWidth() {
		return getInt(this, 'stroke-width', { fallback: 1 });
	}

	set strokeWidth(val) {
		setInt(this, 'stroke-width', val, { min: 0 });
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
		const { max, value, fill, size, stroke, strokeWidth } = this;
		this.tabIndex = 0;
		internals.role = 'slider';
		internals.ariaLabel = 'Star Rating';
		internals.ariaValueMin = '0';
		internals.ariaValueNow = `${value}`;
		internals.ariaValueText = `${value} out of ${max} stars`;

		if (! this.hasAttribute('max')) {
			internals.ariaValueMax = `${max}`;
			getContainer(this).replaceChildren(...createStars(max, { fill, size, value, stroke, strokeWidth }));
		}

		if (! this.hasAttribute('value')) {
			this.value = 0;
		}

		this.dispatchEvent(new Event('connected'));
	}
	
	formResetCallback() {
		const { internals } = protectedData.get(this);
		this.removeAttribute('value');

		getStars(this).forEach(star => {
			star.setAttribute('fill', 'none');
			star.classList.remove('checked');
		});

		internals.setFormValue(0, 0);
		internals.ariaValueNow = '0';
		internals.ariaValueText = `0 out of ${this.max} stars`;

		if (this.required) {
			internals.setValidity({ valueMissing: true }, 'Please select a star rating.', getContainer(this));
			internals.states.add(STATES.invalid);
			internals.states.delete(STATES.valid);
		}
	}

	formStateRestoreCallback(state) {
		this.value = state;
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'fill':
				updateFill(this);
				if (! this.hasAttribute('stroke')) {
					updateStroke(this);
				}
				break;

			case 'max':
				this.ready.then(() => {
					const { max, fill, size, stroke, strokeWidth } = this;
					protectedData.get(this).internals.ariaValueMax = `${max}`;
					getContainer(this).replaceChildren(...createStars(max, { fill, size, max, stroke, strokeWidth }));
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

			case 'stroke':
				updateStroke(this);
				break;

			case 'stroke-width':
				updateStrokeWidth(this);
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
		if (this.value > 0) {
			this.value--;
		}
	}

	static get observedAttributes() {
		return [...HTMLCustomInputElement.observedAttributes, 'max', 'value', 'fill', 'size', 'stroke', 'stroke-width'];
	}
});
