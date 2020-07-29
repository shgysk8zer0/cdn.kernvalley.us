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
 * @TODO Implement queue or stacking of notifications
 * @SEE https://developer.mozilla.org/en-US/docs/Web/API/Notification
 */
export default class HTMLNotificationElement extends HTMLCustomElement {
	constructor(title, {
		body = null,
		icon = null,
		dir = 'auto',
		lang = '',
		tag = '',
		data = null,
		requireInteraction = false,
	} = {}) {
		super();
		this.setAttribute('role', 'dialog');
		this.setAttribute('label', 'Notification');
		this.attachShadow({mode: 'open'});

		this.onshow = null;
		this.onclose = null;
		this.onclick = null;
		this.onerror = null;

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

			this.dispatchEvent(new Event('ready'));
		});

		this.dir = dir;
		this.lang = lang;
		this.data = data;
		this.setAttribute('tag', tag);
		this.hidden = true;

		this.addEventListener('click', () => this.close(), { once: true });

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

		if (! (this.parentElement instanceof HTMLEmbedElement)) {
			document.body.append(this);
		}

		this.stylesLoaded.then(() => this.hidden = false);

		if (! requireInteraction) {
			setTimeout(() => this.close(), 5000);
		}

		Promise.resolve(new Event('show')).then(evt => this.dispatchEvent(evt));
	}

	get title() {
		return getSlot('title', this);
	}

	get body() {
		return getSlot('body', this);
	}

	get tag() {
		return this.getAttribute('tag');
	}

	close() {
		this.dispatchEvent(new Event('close'));
	}

	static get permission() {
		return 'granted';
	}

	static async requestPermission() {
		return 'granted';
	}
}

// @SEE https://developer.mozilla.org/en-US/docs/Web/API/Notification
HTMLCustomElement.register('html-notification', HTMLNotificationElement);
