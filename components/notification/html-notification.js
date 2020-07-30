import HTMLCustomElement from '../custom-element.js';

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
	} = {}) {
		super();
		this.setAttribute('role', 'dialog');
		this.setAttribute('label', 'Notification');
		this.attachShadow({mode: 'open'});

		this.hidden = true;
		this.onshow = null;
		this.onclose = null;
		this.onclick = null;
		this.onerror = null;
		this.timestamp = timestamp;

		this.getTemplate('./components/notification/html-notification.html').then(tmp => {
			tmp.querySelector('[part="close"]').addEventListener('click', () => this.close(), {
				capture: true,
				once: true,
				passive: true,
			});

			this.shadowRoot.append(tmp);

			if (typeof title === 'string') {
				const titleEl = document.createElement('span');
				titleEl.textContent = title;
				titleEl.slot = 'title';
				this.append(titleEl);
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
				const bodyEl = document.createElement('p');
				bodyEl.textContent = body;
				bodyEl.slot = 'body';
				this.append(bodyEl);
			}

			if (typeof icon === 'string' || icon instanceof URL) {
				const iconEl = new Image(64, 64);
				iconEl.crossOrigin = 'anonymous';
				iconEl.loading = 'lazy';
				iconEl.decoding = 'async';
				iconEl.slot = 'icon';
				iconEl.src = icon;
				this.append(iconEl);
			}

			if (typeof badge === 'string' || badge instanceof URL) {
				const badgeEl = new Image(22, 22);
				badgeEl.crossOrigin = 'anonymous';
				badgeEl.loading = 'lazy';
				badgeEl.decoding = 'async';
				badgeEl.slot = 'badge';
				badgeEl.src = badge;
				this.append(badgeEl);
			}

			if (data) {
				const script = document.createElement('script');
				script.type = 'application/json';
				script.textContent = JSON.stringify(data);
				script.slot = 'data';
				this.append(script);
			}

			if (typeof image === 'string' || image instanceof URL) {
				const imageEl = new Image();
				imageEl.height = 80;
				imageEl.crossOrigin = 'anonymous';
				imageEl.loading = 'lazy';
				imageEl.decoding = 'async';
				imageEl.slot = 'image';
				imageEl.src = image;
				this.append(imageEl);
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

		if (Array.isArray(vibrate)) {
			this.setAttribute('vibrate', vibrate.join(' '));
		} else if (Number.isInteger(vibrate)) {
			this.setAttribute('vibrate', vibrate);
		}

		this.addEventListener('close', () => {
			if (this.animate instanceof Function) {
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

		if (! (this.parentElement instanceof HTMLElement)) {
			document.body.append(this);
		}

		if (! this.requireInteraction) {
			setTimeout(() => this.close(), 5000);
		}

		this.addEventListener('show', () => {
			const pattern = this.vibrate;
			if (! this.silent && pattern.length !== 0 && ! pattern.every(n => n === 0)  && (navigator.vibrate instanceof Function)) {
				navigator.vibrate(this.vibrate);
			}
		}, {
			once: true,
		});

		this.stylesLoaded.then(() => {
			this.hidden = false;
			this.dispatchEvent(new Event('show'));
		});
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

	get title() {
		return getSlot('title', this);
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

	get requireInteraction() {
		return this.hasAttribute('requireinteraction');
	}

	get silent() {
		return this.hasAttribute('silent');
	}

	get tag() {
		return this.getAttribute('tag');
	}

	get vibrate() {
		if (this.hasAttribute('vibrate')) {
			return this.getAttribute('vibrate').split(' ')
				.map(n => parseInt(n));
		} else {
			return 0;
		}
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
