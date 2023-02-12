import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createSVG as svg, createRect as rect, createGroup as g } from '../../js/std-js/svg.js';
import { getInt, setInt, getString, setString } from '../../js/std-js/attrs.js';
const protectedData = new WeakMap();

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
		const height = 12.837;
		const width = 26.263;
		const rx = 6.4187;
		const ry = rx;
		const rotate = n => `rotate(${n})`;
		shadow.append(svg({
			viewBox: [0, 0, 106.82, 106.82],
			fill,
			part: ['spinner'],
			height: size,
			width: size,
			children: [
				g({
					transform: 'translate(-73.591 -148.34)',
					children: [
						rect({ height, width, rx, ry, x: 154.15,  y: 195.33,                                            }),
						rect({ height, width, rx, ry, x: 36.256,  y: 231.8,   transform: rotate(-30),                   }),
						rect({ height, width, rx, ry, x: -84.075, y: 204.44,  transform: rotate(-60), opacity: 0.0833,  }),
						rect({ height, width, rx, ry, x: -174.6,  y: 120.58,  transform: rotate(-90), opacity: 0.16666, }),
						rect({ height, width, rx, ry, x: -211.07, y: 2.6915,  transform: rotate(240), opacity: 0.25,    }),
						rect({ height, width, rx, ry, x: -183.71, y: -117.64, transform: rotate(210), opacity: 0.3333,  }),
						rect({ height, width, rx, ry, x: -99.854, y: -208.17, transform: rotate(180), opacity: 0.4166,  }),
						rect({ height, width, rx, ry, x: 18.035,  y: -244.64, transform: rotate(150), opacity: 0.5,     }),
						rect({ height, width, rx, ry, x: 138.37,  y: -217.28, transform: rotate(120), opacity: 0.5833,  }),
						rect({ height, width, rx, ry, x: 228.9,   y: -133.42, transform: rotate(90),  opacity: 0.6666,  }),
						rect({ height, width, rx, ry, x: 265.37,  y: -15.529, transform: rotate(60),  opacity: 0.75,    }),
						rect({ height, width, rx, ry, x: 238.01,  y: 104.8,   transform: rotate(30),  opacity: 0.8333,  }),
					]
				})
			],
			animation: {
				keyframes: [
					{ transform: 'none' },
					{ transform: 'rotate(1turn)' },
				],
				direction,
				duration,
				iterations,
				easing,
			}
		}));
	}

	get direction() {
		return getString(this, 'direction', { fallback: 'normal' });
	}

	set direction(val) {
		setString(this, 'direction', val);
	}

	get duration() {
		return getInt(this, 'duration', { fallback: 1600 });
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
		return getInt(this, 'iterations', { fallback: Infinity });
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
		return getInt(this, 'size', { fallback: 96 });
	}

	set size(val) {
		setInt(this, 'size', val, { min: 0 });
	}
});
