import HTMLCustomElement from '../custom-element.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { purify as policy } from '../../js/std-js/purify.js';

function getSlot(name, base) {
	const slot = base.shadowRoot.querySelector(`slot[name="${name}"]`);

	if (slot instanceof HTMLElement) {
		const els = slot.assignedElements();

		return els.length === 1 ? els[0].textContent : null;
	} else {
		return null;
	}
}

/**
 * Notification API implemented as a custom element
 * Note: Unlike most other custom elements, this exports the class
 * for better compatibility with the Notification API.
 *
 * Also, since `actions` are only available in service worker notifications,
 * here they still dispatch a `notificationclick` event with `actions` & `notification`
 * set on the event.
 *
 * @TODO Implement queue or stacking of notifications
 * @SEE https://developer.mozilla.org/en-US/docs/Web/API/Notification
 */
export class HTMLNotificationElement extends HTMLCustomElement {
	constructor(title, {
		body = null,
		icon = null,
		badge = null,
		image = null,
		dir = 'auto',
		lang = '',
		tag = '',
		data = null,
		vibrate = null,
		silent = false,
		timestamp = Date.now(),
		requireInteraction = false,
		actions = [],
		signal = undefined,
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });

		Promise.resolve().then(() => {
			this.setAttribute('role', 'dialog');
			this.setAttribute('label', 'Notification');

			this.hidden = true;
			this.onshow = null;
			this.onclose = null;
			this.onclick = null;
			this.onerror = null;
		});

		this.getTemplate('./components/notification/html-notification.html', { signal, policy }).then(tmp => {
			tmp.querySelector('[part="close"]').addEventListener('click', () => this.close(), {
				capture: true,
				once: true,
				passive: true,
			});

			this.shadowRoot.append(tmp);

			if (typeof title === 'string') {
				this.setSlot('title', title);
			}

			if (Array.isArray(actions) && actions.length !== 0) {
				this.append(...actions.map(({ title = '', action = '', icon = null }) => {
					const btn = document.createElement('button');
					const text = document.createElement('span');
					btn.type = 'button';
					btn.title = title;
					text.textContent = title;
					btn.dataset.action = action;
					btn.slot = 'actions';
					btn.classList.add('no-border', 'no-background', 'background-transparent');

					if (typeof icon === 'string' && icon !== '') {
						const img = new Image(22, 22);
						img.decoding = 'async';
						img.referrerPolicy = 'no-referrer';
						img.crossOrigin = 'anonymous';
						img.src = icon;
						btn.append(img, document.createElement('br'));
					}

					btn.append(text);
					return btn;
				}));
			}

			if (typeof body === 'string') {
				this.setSlot('body', body, { tag: 'p' });
			}

			if (Number.isInteger(timestamp)) {
				this.setAttribute('timestamp', timestamp);
			} else if (timestamp instanceof Date) {
				this.setAttribute('timestamp', timestamp.getTime());
			}

			if (typeof icon === 'string' || icon instanceof URL) {
				this.setSlot('icon', null, {
					tag: 'img',
					attrs: {
						src: icon,
						height: 64,
						width: 64,
						loading: 'lazy',
						decoding: 'async',
						crossorigin: 'anonymous',
						referrerpolicy: 'no-referrer',
					}
				});
			}

			if (typeof badge === 'string' || badge instanceof URL) {
				this.setSlot('badge', null, {
					tag: 'img',
					attrs: {
						src: badge,
						height: 22,
						width: 22,
						loading: 'lazy',
						decoding: 'async',
						crossorigin: 'anonymous',
						referrerpolicy: 'no-referrer',
					},
				});
			}

			if (data) {
				this.setSlot('data', JSON.stringify(data), {
					tag: 'script',
					attrs: { type: 'application/json' },
				});
			}

			if (typeof image === 'string' || image instanceof URL) {
				this.setSlot('image', null, {
					tag: 'img',
					attrs: {
						src: image,
						decoding: 'async',
						referrerpolicy: 'no-referrer',
						crossorigin: 'anonymous',
						loading: 'lazy',
						height: 80,
					}
				});
			}

			this.shadowRoot.querySelector('slot[name="actions"]').assignedElements().forEach(btn => {
				btn.addEventListener('click', event => {
					event.preventDefault();
					const evt = new Event('notificationclick');
					evt.action = event.target.closest('[data-action]').dataset.action;
					evt.notification = this;
					this.dispatchEvent(evt);
				}, {
					capture: true,
				});
			});

			this.dispatchEvent(new Event('ready'));
		});

		this.dir = dir;
		this.lang = lang;
		this.setAttribute('tag', tag);

		if (silent) {
			this.setAttribute('silent', '');
		}

		if (requireInteraction) {
			this.setAttribute('requireinteraction', '');
		}

		if (Array.isArray(vibrate) || Number.isInteger(vibrate)) {
			this.vibrate = vibrate;
		}

		this.addEventListener('close', () => {
			if (! this.hidden && this.isConnected && this.animate instanceof Function) {
				this.animate([{
					opacity: 1,
					transform: 'none',
				}, {
					opacity: 0,
					transform: 'translateY(64px)',
				}], {
					duration: 300,
					easing: 'ease-in',
					fill: 'forwards',
				}).finished.then(() => this.remove());
			} else {
				this.remove();
			}
		}, {
			once: true,
		});

		if (! this.isConnected && ! (signal instanceof AbortSignal && signal.aborted)) {
			document.body.append(this);
		}

		this.addEventListener('show', () => {
			if (! this.requireInteraction) {
				setTimeout(() => this.close(), 5000);
			}

			const pattern = this.vibrate;
			if (! this.silent && pattern.length !== 0 && ! pattern.every(n => n === 0)  && (navigator.vibrate instanceof Function)) {
				navigator.vibrate(this.vibrate);
			}
		}, {
			once: true,
			signal,
		});

		if (signal instanceof AbortSignal && ! signal.aborted) {
			signal.addEventListener('abort', () => {
				if (this.hidden) {
					this.remove();
				} else {
					this.close();
				}
			}, { once: true });
		}

		this.stylesLoaded.then(() => {
			if ('locks' in navigator && navigator.locks.request instanceof Function) {
				navigator.locks.request('html-notification', { mode: 'exclusive', signal }, async () => {
					const { resolve, promise } = getDeferred();
					this.hidden = false;
					this.dispatchEvent(new Event('show'));
					this.addEventListener('close', resolve);
					await promise;
				});
			} else {
				this.hidden = false;
				this.dispatchEvent(new Event('show'));
			}
		});
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	disconnectedCallback() {
		if (! this.hidden) {
			this.dispatchEvent(new Event('close'));
		}
	}

	get actions() {
		return this.shadowRoot.querySelector('slot[name="actions"]').assignedElements()
			.map(btn => {
				const icon = btn.querySelector('img');
				return {
					title: btn.title,
					action: btn.dataset.action,
					icon: icon instanceof HTMLImageElement ? icon.src : null,
				};
			});
	}

	get badge() {
		const slot = this.shadowRoot.querySelector('slot[name="badge"]');
		const assigned = slot.assignedElements();

		if (assigned.length !== 0) {
			return assigned[0].src;
		} else {
			return null;
		}
	}

	get body() {
		return getSlot('body', this);
	}

	get data() {
		const dataSlot = this.shadowRoot.querySelector('slot[name="data"]');

		const assigned = dataSlot.assignedElements();

		if (assigned.length === 0) {
			return null;
		} else if (assigned.length === 1) {
			return JSON.parse(assigned[0].textContent);
		} else {
			return assigned.map(script => script.textContent);
		}
	}

	get icon() {
		const slot = this.shadowRoot.querySelector('slot[name="icon"]');
		const assigned = slot.assignedElements();

		if (assigned.length !== 0) {
			return assigned[0].src;
		} else {
			return null;
		}
	}

	get image() {
		const slot = this.shadowRoot.querySelector('slot[name="image"]');
		const assigned = slot.assignedElements();

		if (assigned.length !== 0) {
			return assigned[0].src;
		} else {
			return null;
		}
	}

	get requireInteraction() {
		return this.hasAttribute('requireinteraction');
	}

	set requireInteraction(value) {
		this.toggleAttribute('requireinteraction', value);
	}

	get silent() {
		return this.hasAttribute('silent');
	}

	set silent(value) {
		this.toggleAttribute('silent', value);
	}

	get tag() {
		return this.getAttribute('tag');
	}

	set tag(value) {
		if (typeof value === 'string') {
			this.setAttribute('tag', value);
		} else {
			this.removeAttribute('tag');
		}
	}

	get timestamp() {
		if (this.hasAttribute('timestamp')) {
			return parseInt(this.getAttribute('timestamp'));
		} else {
			return Date.now();
		}
	}

	set timestamp(value) {
		if (Number.isInteger(value)) {
			this.setAttribute('timestamp', value);
		} else if (value instanceof Date) {
			this.timestamp = value.getTime();
		} else if (typeof value === 'string' && value.length !== 0) {
			this.timestamp = Date.parse(value);
		} else {
			this.removeAttribute('timestamp');
		}
	}

	get title() {
		return getSlot('title', this);
	}

	get vibrate() {
		if (this.hasAttribute('vibrate')) {
			return this.getAttribute('vibrate').split(' ')
				.map(n => parseInt(n));
		} else {
			return [0];
		}
	}

	set vibrate(value) {
		if (Array.isArray(value)) {
			this.setAttribute('vibrate', value.join(' '));
		} else if (Number.isInteger(value) || typeof value === 'string') {
			this.setAttribute('vibrate', value);
		}
	}

	get whenConnected() {
		return new Promise(resolve => {
			if (this.isConnected) {
				resolve();
			} else {
				this.addEventListener('connected', () => resolve(), { once: true });
			}
		});
	}

	close() {
		this.dispatchEvent(new Event('close'));
	}

	static get permission() {
		return 'granted';
	}

	static get maxActions() {
		return 5;
	}

	static async requestPermission() {
		return 'granted';
	}
}

// @SEE https://developer.mozilla.org/en-US/docs/Web/API/Notification
HTMLCustomElement.register('html-notification', HTMLNotificationElement);
