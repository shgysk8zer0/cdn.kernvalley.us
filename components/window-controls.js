import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { displayMode } from '../js/std-js/media-queries.js';
import { loadStylesheet } from '../js/std-js/loader.js';
import { getDeferred } from '../js/std-js/promises.js';
import { debounce } from '../js/std-js/events.js';
const symbols = {
	shadow: Symbol('shadow'),
};

function getUpdateDisplayCallback(el) {
	return debounce(async () => {
		await Promise.all([
			el.loaded,
			el.connected,
		]);

		const titlebar = el[symbols.shadow].querySelector('slot[name="titlebar"]');
		const fallback = el[symbols.shadow].querySelector('slot[name="fallback"]');

		if (navigator.windowControlsOverlay.visible) {
			titlebar.hidden = false;
			fallback.hidden = true;
			el.hidden = false;
		} else if (fallback.assignedElements().length === 0) {
			el.hidden = true;
		} else {
			el.hidden = false;
			titlebar.hidden = true;
			fallback.hidden = false;
		}
	});
}

registerCustomElement('window-controls', class HTMLWindowControlsElements extends HTMLElement {
	constructor() {
		super();
		this[symbols.shadow] = this.attachShadow({ mode: 'closed' });
		const container = document.createElement('div');
		const titlebar = document.createElement('slot');
		const fallback = document.createElement('slot');
		const grabRegion = document.createElement('div');

		titlebar.name = 'titlebar';
		fallback.name = 'fallback';
		titlebar.part.add('titlebar');
		fallback.part.add('fallback');
		grabRegion.part.add('grab-region');
		container.part.add('container');

		requestAnimationFrame(async () => {
			container.append(titlebar, fallback, grabRegion);
			await loadStylesheet('/components/window-controls.css', { parent: this[symbols.shadow] });
			this[symbols.shadow].append(container);
			this.dispatchEvent(new Event('load'));
		});
	}

	connectedCallback() {
		if (HTMLWindowControlsElements.supported && displayMode() !== 'browser') {
			const callback = getUpdateDisplayCallback(this);
			callback();
			navigator.windowControlsOverlay.addEventListener('geometrychange', callback);
			this.dispatchEvent(new Event('connected'));
		}
	}

	get connected() {
		const { resolve, promise } = getDeferred();

		if (this.isConnected) {
			resolve();
		} else {
			this.addEventListener('connected', () => resolve(), { once: true });
		}

		return promise;
	}

	get loaded() {
		const { resolve, promise } = getDeferred();

		if (this[symbols.shadow].childElementCount > 1) {
			resolve();
		} else {
			this.addEventListener('load', () => resolve(), { once: true });
		}

		return promise;
	}

	get titlebarAreaRect() {
		if (this.overlayVisible) {
			return navigator.windowControlsOverlay.getTitlebarAreaRect();
		} else {
			return this.getBoundingClientRect();
		}
	}

	get overlayVisible() {
		return HTMLWindowControlsElements.supported && navigator.windowControlsOverlay.visible;
	}

	get overlayHidden() {
		return ! this.overlayVisible;
	}

	static get supported() {
		return 'windowControlsOverlay' in navigator;
	}
});
