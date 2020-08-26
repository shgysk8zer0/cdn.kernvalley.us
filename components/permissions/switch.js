import { registerCustomElement } from '../../js/std-js/functions.js';
import '../../js/std-js/permissions.js';

async function changeHandler(event) {
	this.dispatchEvent(new CustomEvent('permissionchange', {
		detail: {
			name: this.name,
			state: event.target.state || await this.state,
		}
	}));
}

const map = new WeakMap();

registerCustomElement('permissions-switch', class HTMLPermissionsSwitchButtonElement extends HTMLElement {
	constructor({
		name = null,
		sysex = null,
		userVisibleOnly = null,
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });

		const promptSlot  = document.createElement('slot');
		const grantedSlot = document.createElement('slot');
		const deniedSlot  = document.createElement('slot');

		promptSlot.name  = 'prompt';
		grantedSlot.name = 'granted';
		deniedSlot.name  = 'denied';

		promptSlot.hidden  = true;
		grantedSlot.hidden = true;
		deniedSlot.hidden  = true;

		this.shadowRoot.append(promptSlot, grantedSlot, deniedSlot);

		this.whenConnected.then(() => {
			if (typeof name === 'string') {
				this.name = name;
			}

			if (typeof sysex === 'boolean') {
				this.sysex = sysex;
			}

			if (typeof userVisibleOnly === 'boolean') {
				this.userVisibleOnly = userVisibleOnly;
			}
		});

		this.addEventListener('permissionchange', ({ detail }) => {
			this.shadowRoot.querySelectorAll('slot[name]').forEach(slot => {
				slot.hidden = slot.name !== detail.state;
			});
		});
	}

	get allowed() {
		return this.permission.then(({ state }) => state === 'granted');
	}

	get name() {
		return this.getAttribute('name');
	}

	set name(val) {
		if (typeof val === 'string') {
			this.setAttribute('name', val);
		} else {
			this.removeAttribute('name');
		}
	}

	get permission() {
		if (typeof this.name !== 'string') {
			return Promise.reject('No permission attribute set');
		} else {
			return navigator.permissions.query({
				name: this.name,
				sysex: this.sysex,
				userVisibleOnly: this.userVisibleOnly,
			});
		}
	}

	get state() {
		return this.permission.then(({ state }) => state);
	}

	get sysex() {
		return this.hasAttribute('sysex');
	}

	set sysex(val) {
		this.toggleAttribute('sysex', val);
	}

	get userVisibleOnly() {
		return this.hasAttribute('uservisibleonly');
	}

	set userVisibleOnly(val) {
		this.toggleAttribute('uservisibleonly');
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true }));
		}
	}

	async query() {
		return navigator.permissions.query({
			name: this.name,
			sysex: this.sysex,
			userVisibleOnly: this.userVisibleOnly,
		});
	}

	async request() {
		return navigator.permissions.request({
			name: this.name,
			sysex: this.sysex,
			userVisibleOnly: this.userVisibleOnly,
		});
	}

	static get supported() {
		return ('permissions' in navigator) && navigator.permissions.query instanceof Function;
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'name':
				if (typeof oldVal === 'string' && map.has(this)) {
					const { perms, callback } = map.get(this);
					perms.removeEventListener('change', callback);
					map.delete(this);
				}

				if (HTMLPermissionsSwitchButtonElement.supported && typeof newVal === 'string') {
					this.permission.then(perms => {
						const callback = changeHandler.bind(this);
						map.set(this, { perms, callback });
						perms.addEventListener('change', callback);

						this.dispatchEvent(new CustomEvent('permissionchange', {
							detail: {
								name: newVal,
								state: perms.state,
							}
						}));
					});
				}
				break;

			default: throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return ['name'];
	}
});
