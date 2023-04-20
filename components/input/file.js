import { HTMLCustomInputElement, STATES } from './custom-input.js';
import { open } from '../../js/std-js/filesystem.js';
import { createElement } from '../../js/std-js/elements.js';
import { createFileIcon } from '../../js/std-js/icons.js';
import { getString, setString } from '../../js/std-js/attrs.js';
import { getDeferred } from '../../js/std-js/promises.js';

const protectedData = new WeakMap();

function allowedFile(file, accept) {
	if (accept.length === 0) {
		return true;
	} else {
		return accept.some(type => {
			if (type === '*/*') {
				return true;
			} else if (type.startsWith('.')) {
				return file.name.endsWith(type);
			} else if (type.endsWith('/*')) {
				return file.type.toLowerCase().startsWith(type.substr(0, type.length - 1).toLowerCase());
			} else {
				return file.type.toLowerCase() === type.toLowerCase();
			}
		});
	}
}

customElements.define('input-file', class HTMLINputFileElement extends HTMLCustomInputElement {
	constructor() {
		super();
		const internals = this.attachInternals();
		internals.ariaBusy = 'true';
		internals.role = 'button';
		internals.states.add(STATES.loading);
		const shadow = this.attachShadow({ mode: 'closed' });

		shadow.append(createElement('div', {
			part: ['container'],
			children: [
				createElement('button', {
					type: 'button',
					part: ['btn'],
					title: 'Select a file',
					events: {
						click: async () => {
							const { accept, prompt: description } = this;
							const [file = null] = await open({ accept, description }).catch(console.error);
							this.value = file;
						}
					},
					children: [
						createElement('slot', {
							name: 'icon',
							children: [createFileIcon({ size: 18, fill: 'currentColor' })]
						})
					]
				}),
				createElement('span', {
					part: ['filename'],
					text: 'No file selected',
				})
			]
		}));

		protectedData.set(this, { internals, shadow, file: null });
		internals.states.delete(STATES.loading);
		internals.ariaBusy = 'false';
		this.dispatchEvent(new Event('ready'));
	}

	formDisabledCallback(disabled) {
		protectedData.get(this).shadow.querySelector('[part~="btn"]').disabled = disabled;
		super.formDisabledCallback(disabled);
	}

	formResetCallback() {
		this.value = null;
	}

	formStateRestoreCallback(state, mode) {
		this.value = state;
		console.log({ state, mode });
	}

	get accept() {
		const val = getString(this, 'accept');
		return typeof val === 'string'
			? val.trim().split('').map(str => str.trim())
			: [];
	}

	set accept(val) {
		if (Array.isArray(val) && val.length !== 0) {
			setString(this, 'accept', val.join(', ').trim());
		} else {
			this.removeAttribute('accept');
		}
	}

	get files() {
		if (protectedData.has(this)) {
			const { file } = protectedData.get(this);
			return file instanceof File ? [file] : [];
		} else {
			return [];
		}
	}

	get prompt() {
		return getString(this, 'prompt', { fallback: 'Select a file' });
	}

	set prompt(val) {
		setString(this, 'prompt', val);
	}

	get value() {
		return protectedData.has(this) ? protectedData.get(this).file : null;
	}

	set value(file) {
		this.ready.then(() => {
			const { required, accept } = this;
			const { internals, shadow } = protectedData.get(this);
			const filename = shadow.querySelector('[part~="filename"]');

			if (! (file instanceof File) && required) {
				internals.states.add(STATES.invalid);
				internals.states.delete(STATES.valid);
				internals.setValidity({ missingInput: true }, 'No file selected');
				internals.setFormValue(null, null);
				protectedData.set(this, { ...protectedData.get(this), file: null });
				filename.textContent = 'Please select a file';
			} else if (file instanceof File && ! allowedFile(file, accept)) {
				internals.states.add(STATES.invalid);
				internals.states.delete(STATES.valid);
				internals.setValidity({ badInput: true }, 'Please select a valid file');
				internals.setFormValue(null, null);
				protectedData.set(this, { ...protectedData.get(this), file: null });
				filename.textContent = file.name;
			} else if (! (file instanceof File)) {
				internals.states.delete(STATES.invalid);
				internals.states.add(STATES.valid);
				internals.setValidity({}, '');
				internals.setFormValue(null, null);
				protectedData.set(this, { ...protectedData.get(this), file: null });
				filename.textContent = 'Please select a file';
			} else {
				internals.states.delete(STATES.invalid);
				internals.states.add(STATES.valid);
				internals.setValidity({}, '');
				internals.setFormValue(file, file);
				protectedData.set(this, { ...protectedData.get(this), file });
				filename.textContent = file.name;
			}
		});
	}

	get ready() {
		const { resolve, promise } = getDeferred();

		if (! protectedData.has(this)) {
			this.addEventListener('ready', () => resolve(), { once: true });
		} else {
			resolve();
		}

		return promise;
	}
});
