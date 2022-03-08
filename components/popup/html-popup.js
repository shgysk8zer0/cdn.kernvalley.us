import HTMLCustomElement from '../custom-element.js';
import { purify as policy } from '../../js/std-js/htmlpurify.js';

HTMLCustomElement.register('html-popup', class HTMLPopupElement extends HTMLCustomElement {
	constructor(content = null, {
		open       = null,
		timer      = null,
		autoRemove = null,
		vibrate    = null,
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });
		this.addEventListener('click', () => this.close(), { passive: true, capture: true });

		this.getTemplate('./components/popup/html-popup.html', { policy }).then(tmp => {
			this.shadowRoot.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});

		this.whenConnected.then(() => {
			this.hidden = true;

			if (typeof content === 'string') {
				this.content = content;
			}

			if (typeof open === 'boolean') {
				this.open = open;
			}

			if (typeof autoRemove === 'boolean') {
				this.autoRemove = autoRemove;
			}

			this.timer = timer;
			this.vibrate = vibrate;
		});
	}

	async connectedCallback() {
		this.dispatchEvent(new Event('connected'));

		if (this.open) {
			const timer = this.timer;
			await this.reveal({ direction: 'normal' });

			if (! Number.isNaN(timer)) {
				setTimeout(() => this.close(), timer);
			}
		}
	}

	get autoRemove() {
		return this.hasAttribute('autoremove');
	}

	set autoRemove(val) {
		this.toggleAttribute('autoremove', val);
	}

	get closed() {
		if (this.open === false) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => {
				this.addEventListener('close', () => resolve(), { once: true });
			});
		}
	}

	get content() {
		if (this.shadowRoot.childElementCount === 0) {
			return Array.from(this.querySelectorAll('[slot="content"]'));
		} else {
			const slot = this.shadowRoot.querySelector('slot[name="content"]');
			return slot.assignedElements();
		}
	}

	set content(val) {
		if (typeof val === 'string') {
			const span = document.createElement('span');
			span.textContent = val;
			this.content = span;
		} else if (val instanceof HTMLElement) {
			val.slot = 'content';
			this.content.forEach(el => el.remove());
			this.append(val);
		} else if (val === null) {
			this.content.forEach(el => el.remove());
		}
	}

	get timer() {
		return parseInt(this.getAttribute('timer'));
	}

	set timer(val) {
		if (typeof val === 'number' && ! Number.isNaN(val)) {
			this.setAttribute('timer', val);
		} else {
			this.removeAttribute('timer');
		}
	}

	get open() {
		return this.hasAttribute('open');
	}

	set open(val) {
		this.toggleAttribute('open', val);
	}

	get opened() {
		if (this.open === true) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => {
				this.addEventListener('open', () => resolve(), { once: true });
			});
		}
	}

	async show() {
		await new Promise(resolve => {
			this.addEventListener('open', () => resolve(), { once: true });
			this.open = true;
			const vibrate = this.vibrate;

			if (navigator.vibrate instanceof Function && (Array.isArray(vibrate) || Number.isInteger(vibrate))) {
				navigator.vibrate(vibrate);
			}
		});
	}

	get vibrate() {
		if (this.hasAttribute('vibrate')) {
			return JSON.parse(this.getAttribute('vibrate'));
		} else {
			return null;
		}
	}

	set vibrate(val) {
		if (Array.isArray(val) || Number.isInteger(val)) {
			this.setAttribute('vibrate', JSON.stringify(val));
		} else {
			this.removeAttribute('vibrate');
		}
	}

	async close() {
		await new Promise(resolve => {
			this.addEventListener('close', () => resolve(), { once: true });
			this.open = false;
		});
	}

	async reveal({ direction = 'normal', duration = 400 } = {}) {
		if (this.animate instanceof Function) {
			await this.animate([{
				opacity: 0,
				transform: 'translate(-50%, 100%)',
			}, {
				opacity: 1,
				transform: 'translate(-50%, 0)',
			}], {
				duration,
				easing: 'ease-in',
				fill: 'both',
				direction,
				composite: 'replace',
			}).finished;
		} else {
			return Promise.resolve();
		}
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'open':
				if (newVal !== null) {
					this.dispatchEvent(new Event('open'));
					const prom = this.reveal({ direction: 'normal' });
					this.hidden = false;
					const timer = this.timer;
					await prom;

					if (! Number.isNaN(timer)) {
						setTimeout(() => this.close(), timer);
					}
				} else {
					this.dispatchEvent(new Event('closing'));
					await this.reveal({ direction: 'reverse'});
					this.hidden = true;
					this.dispatchEvent(new Event('close'));
				}
				break;

			case 'autoremove':
				if (typeof newVal === 'string') {
					this.addEventListener('close', this.remove);
				} else {
					this.removeEventListener('close', this.remove);
				}
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'open',
			'autoremove',
		];
	}
});
