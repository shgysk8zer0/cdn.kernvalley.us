/* global ScrollTimeline, CSSUnitValue, globalThis */
import { css } from '../../js/std-js/dom.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';

registerCustomElement('scroll-progress', class HTMLScrollProgressElement extends HTMLElement {
	async connectedCallback() {
		if ('ScrollTimeline' in globalThis) {
			const shadow = this.attachShadow({ mode: 'closed' });
			const progress = document.createElement('div');
			progress.setAttribute('part', 'progress');
			css(this, { display: 'block' });
			shadow.append(progress);
			css(progress, {
				'background-color': 'currentColor',
				height: '100%',
				'min-height': '6px',
				'transform-origin': '0 50%',
				transform: 'scaleX(0)'
			});
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
		} else {
			this.remove();
		}
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
});
