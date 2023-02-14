import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { rotate } from '../../js/std-js/svg.js';
import { createSpinnerIcon } from '../../js/std-js/icons.js';
import { getInt, setInt, getString, setString } from '../../js/std-js/attrs.js';

const protectedData = new WeakMap();

const keyframes = [
	{ transform: 'none' },
	{ transform: rotate('1turn') },
];

registerCustomElement('loading-spinner', class HTMLLoadingSpinnerElement extends HTMLElement {
	constructor({ size, duration, direction, fill, iterations, easing } = {}) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		protectedData.set(this, { shadow });

		if (typeof size === 'number') {
			this.size = size;
		}

		if (typeof duration === 'number') {
			this.duration = duration;
		}

		if (typeof fill === 'string') {
			this.fill = fill;
		}

		if (typeof direction === 'string') {
			this.direction = direction;
		}

		if (typeof iterations === 'number') {
			this.iterations = iterations;
		}

		if (typeof easing === 'string') {
			this.easing = easing;
		}
	}

	connectedCallback() {
		const { shadow } = protectedData.get(this);
		const { size, duration, direction, fill, iterations, easing } = this;

		shadow.append(createSpinnerIcon({
			size, fill, part: ['spinner'],
			animation: { keyframes, direction, duration, iterations, easing, fill: 'both' },
		}));
	}

	get direction() {
		return getString(this, 'direction', { fallback: 'normal' });
	}

	set direction(val) {
		setString(this, 'direction', val);
	}

	get duration() {
		return getInt(this, 'duration', { fallback: 1600, min: 1 });
	}

	set duration(val) {
		setInt(this, 'duration', val, { min: 0 });
	}

	get easing() {
		return getString(this, 'easing', { fallback: 'linear' });
	}

	set easing(val) {
		setString(this, 'easing', val);
	}

	get iterations() {
		return getInt(this, 'iterations', { fallback: Infinity, min: 0 });
	}

	set iterations(val) {
		setInt(this, 'iterations', val, { min: 0 });
	}

	get fill() {
		return getString(this, 'fill', { fallback: 'currentColor' });
	}

	set fill(val) {
		setString(this, 'fill', val);
	}

	get size() {
		return getInt(this, 'size', { fallback: 96, min: 0 });
	}

	set size(val) {
		setInt(this, 'size', val, { min: 0 });
	}
});
