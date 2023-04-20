import { getDeferred } from '../../js/std-js/promises.js';
import { getURLResolver, callOnce } from '../../js/std-js/utility.js';
import { createPolicy } from '../../js/std-js/trust.js';
import { meta } from '../../import.meta.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { createElement, createImage } from '../../js/std-js/elements.js';
import { createXIcon, createBellIcon } from '../../js/std-js/icons.js';
import { getString, setString, getInt, setInt } from '../../js/std-js/attrs.js';
import { remove } from '../../js/std-js/dom.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';

// Need to create `<script type="application/json">`s
const policyName = 'html-notification#script';
const resolveURL = getURLResolver({ base: meta.url, path: '/components/notification/' });
const getPolicy = callOnce(() => createPolicy(policyName, { createScript: input => input }));
const protectedData = new WeakMap();

function getSlot(name, base) {
	const { shadow } = protectedData.get(base);
	const slot = shadow.querySelector(`slot[name="${name}"]`);

	if (slot instanceof HTMLElement) {
		const els = slot.assignedElements();

		return els.length === 1 ? els[0].textContent : null;
	} else {
		return null;
	}
}

function clearSlot(name, base) {
	remove(`[slot="${name}"]`, { base });
}

function setSlot(name, content, base) {
	if (typeof content === 'string') {
		return setSlot(name, createElement('span', { text: content, slot: name }), base);
	} else if (content instanceof Element) {
		clearSlot(name, base);
		content.slot = name;
		base.append(content);
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
 * @SEE https://developer.mozilla.org/en-US/docs/Web/API/Notification
 */
export class HTMLNotificationElement extends HTMLElement {
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
		timestamp = undefined,
		requireInteraction = false,
		actions = [],
		signal = undefined,
	} = {}) {
		super();
		const shadow = this.attachShadow({ mode: 'open' });
		const internals = this.attachInternals();
		protectedData.set(this, { shadow, internals });

		Promise.resolve().then(() => {
			internals.role = 'dialog';
			this.hidden = true;
			this.onshow = null;
			this.onclose = null;
			this.onclick = null;
			this.onerror = null;
		});

		const tmp = createElement('div', {
			part: 'container',
			children: [
				createElement('button', {
					type: 'button',
					events: { click: () => this.close() },
					children: [
						createElement('slot', {
							name: 'close-icon',
							children: [createXIcon({ size: 22, fill: 'currentColor' })]
						})
					]
				}),
				createElement('span', {
					part: ['url'],
					children: [createElement('slot', { name: 'url' })]
				}),
				createElement('span', {
					part: ['icon'],
					children: [
						createElement('slot', {
							name: 'icon',
							children: [createBellIcon({ size: 56, fill: 'currentColor' })],
						})
					]
				}),
				createElement('h4', {
					part: ['title'],
					children: [createElement('slot', { name: 'title' })]
				}),
				createElement('span', {
					part: ['badge'],
					children: [
						createElement('slot', {
							name: 'badge',
							children: [createBellIcon({ size: 16, fill: 'currentColor' })]
						})
					]
				}),
				createElement('p', {
					part: ['body'],
					children: [createElement('slot', { name: 'body' })]
				}),
				createElement('div', {
					part: ['image'],
					children: [createElement('slot', { name: 'image' })]
				}),
				createElement('div', {
					part: ['actions'],
					children: [createElement('slot', { name: 'actions' })],
				}),
				createElement('slot', { name: 'data', hidden: true }),
				createElement('slot', { name: 'timestamp' })
			]
		});

		loadStylesheet(resolveURL('./html-notification.css'), { parent: shadow }).then(() => {
			shadow.append(...tmp.children);

			if (typeof title === 'string') {
				setSlot('title', title, this);
			}

			if (Array.isArray(actions) && actions.length !== 0) {
				const click = event => {
					event.preventDefault();
					const evt = new Event('notificationclick');
					evt.action = event.currentTarget.dataset.action;
					evt.notification = this;
					this.dispatchEvent(evt);
				};

				this.append(...actions.map(({ title = '', action = '', icon = null }) => {
					const btn = createElement('button', {
						type: 'button',
						classList: ['no-border', 'no-background', 'background-transparent'],
						title: title,
						dataset: { action },
						events: { click },
						slot: 'actions',
					});

					if ((typeof icon === 'string' && icon !== '') || icon instanceof URL) {
						btn.append(createImage(icon, {
							height: 22,
							width: 22,
							decoding: 'async',
							crossOrigin: 'anonymous',
							referrerPolicy: 'no-referrer',
						}), document.createElement('br'), createElement('span', { text: title }));
					} else {
						btn.append(createElement('span', { text: title }));
					}

					return btn;
				}));
			}

			if (typeof body === 'string') {
				setSlot('body', body, this);
			}

			if (Number.isInteger(timestamp)) {
				this.timestamp = timestamp;
			}

			if (typeof icon === 'string' || icon instanceof URL) {
				setSlot('icon', createImage(icon, {
					height: 64,
					width: 64,
					loading: 'lazy',
					decoding: 'async',
					crossorigin: 'anonymous',
					referrerpolicy: 'no-referrer',
				}), this);
			}

			if (typeof badge === 'string' || badge instanceof URL) {
				setSlot('badge', createImage(badge, {
					height: 22,
					width: 22,
					loading: 'lazy',
					decoding: 'async',
					crossorigin: 'anonymous',
					referrerpolicy: 'no-referrer',

				}), this);
			}

			if (data) {
				const script = createElement('script', { type: 'application/json' });
				script.text = getPolicy().createScript(JSON.stringify(data));
				setSlot('data', script, this);
			}

			if (typeof image === 'string' || image instanceof URL) {
				setSlot('image', createImage(image, {
					decoding: 'async',
					referrerpolicy: 'no-referrer',
					crossorigin: 'anonymous',
					loading: 'lazy',
					height: 80,
				}), this);
			}

			this.dispatchEvent(new Event('ready'));

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
			const actions = shadow.querySelector('slot[name="actions"]').assignedElements();
			console.log({ actions });
			if (! this.requireInteraction) {
				setTimeout(() => this.close(), 5000);
			}

			const pattern = this.vibrate;
			if (
				! this.silent
				&& pattern.length !== 0
				&& ! pattern.every(n => n === 0)
				&& (navigator.vibrate instanceof Function)
			) {
				navigator.vibrate(this.vibrate);
			}

			if (actions.length !== 0) {
				actions[0].focus();
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
		return getString(this, 'tag');
	}

	set tag(value) {
		setString(this, 'tag', value);
	}

	get timestamp() {
		return getInt(this, 'timestamp', { fallback: Date.now() });
	}

	set timestamp(value) {
		if (value instanceof Date) {
			setInt(this, 'timestamp', value.getTime());
		} else {
			setInt(this, 'timestmap', value);
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
registerCustomElement('html-notification', HTMLNotificationElement);
export const trustPolicies = [policyName];
