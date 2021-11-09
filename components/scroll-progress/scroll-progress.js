import { css } from 'https://cdn.kernvalley.us/js/std-js/dom.js';
import { loadScript } from 'https://cdn.kernvalley.us/js/std-js/loader.js';
/* global ScrollTimeline, CSSUnitValue, globalThis */

async function shim() {
	if (! ('ScrollTimeline' in globalThis)) {
		await loadScript('https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js');
	}
}

const protectedData = new WeakMap();

customElements.define(
	'scroll-progress',
	class HTMLScrollProgressElement extends HTMLElement {
		constructor() {
			super();
			const shadow = this.attachShadow({ mode: 'closed' });
			const progress = document.createElement('div');
			protectedData.set(this, { shadow, progress });
			css(this, { display: 'block' });
			shadow.append(progress);
			css(progress, {
				'background-color': 'currentColor',
				height: '100%',
				'min-height': '6px',
				'transform-origin': '0 50%',
				transform: 'scaleX(0)'
			});
		}

		async connectedCallback() {
			await shim();
			const { progress } = protectedData.get(this);
			// Animate Progress Bar on Scroll
			progress.animate({
				transform: ['scaleX(0)', 'scaleX(1)']
			}, {
				duration: 1,
				fill: 'forwards',
				timeline: new ScrollTimeline({
					source: this.source,
					orientation: 'block',
					scrollOffsets: [
						new CSSUnitValue(0, 'percent'),
						new CSSUnitValue(100, 'percent')
					]
				})
			});
		}

		get source() {
			if (this.hasAttribute('source')) {
				return (
					document.querySelector(this.getAttribute('source')) ||
					document.scrollingElement
				);
			} else {
				return document.scrollingElement;
			}
		}

		set source(val) {
			if (typeof val === 'string' && val.length !== 0) {
				this.setAttribute('source', val);
			} else {
				this.removeAttribute('source');
			}
		}
	}
);
