import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createElement } from '../../js/std-js/elements.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getBool, setBool } from '../../js/std-js/attrs.js';
import { HTMLCustomInputElement, STATES } from './custom-input.js';

const protectedData = new WeakMap();

function setValidity(el) {
	const { internals } = protectedData.get(el);

	if (el.disabled || (! el.required || el.checked)) {
		internals.setValidity({}, '');
		internals.states.delete(STATES.invalid);
		internals.states.add(STATES.valid);
	} else {
		internals.setValidity({ valueMissing: true }, 'This input is required');
		internals.states.add(STATES.invalid);
		internals.states.delete(STATES.invalid);
	}
}

registerCustomElement('input-toggle', class HTMLInputToggleElement extends HTMLCustomInputElement {
	constructor() {
		// This needs to be `function` for binding to work.
		super(function (internals) {
			const shadow = this.attachShadow({ mode: 'closed' });
			internals.states.add(STATES.loading);
			internals.ariaBusy = 'true';

			const container = createElement('div', {
				part: ['container'],
				events: {
					click: () => this.checked = ! this.checked,
				},
				children: [
					createElement('div', { part: ['toggle'] }),
					createElement('span', {
						part: ['on'],
						children: [
							createElement('slot', { name: 'on', text: 'On' }),
						]
					}),
					createElement('span', {
						part: ['off'],
						children: [
							createElement('slot', { name: 'off', text: 'Off' }),
						]
					})
				]
			});

			protectedData.set(this, { shadow, internals });

			loadStylesheet('/components/input/toggle.css', { parent: shadow }).then(() => {
				internals.states.delete(STATES.loading);
				shadow.append(container);
				internals.role = 'checkbox';
				internals.ariaBusy = 'false';
			});
		});
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'checked':
				if (typeof newVal === 'string') {
					const { internals } = protectedData.get(this);
					internals.states.add(STATES.checked);
					internals.ariaChecked = 'true';
					internals.setFormValue(true);
				} else {
					const { internals } = protectedData.get(this);
					internals.states.delete(STATES.checked);
					internals.ariaChecked = 'false';
					internals.setFormValue(false);
				}

				setValidity(this);
				break;

			default:
				super.attributeChangedCallback(name, oldVal, newVal);
				setValidity(this);
				break;
		}
	}

	formAssociatedCallback(form) {
		if (form instanceof HTMLFormElement) {
			const controller = new AbortController();
			form.addEventListener('submit', event => {
				event.preventDefault();
				const data = new FormData(event.target);
				console.log(data);
			}, { signal: controller.signal });
			protectedData.set(this, { ...protectedData.get(this), controller });
		} else {
			const { controller = null } = protectedData.get(this);
			if (controller instanceof AbortController && ! controller.signal.aborted) {
				controller.abort(new DOMException('Form disassociated.'));
			}
		}
	}

	get checked() {
		return getBool(this, 'checked');
	}

	set checked(val) {
		setBool(this, 'checked', val);
	}

	static get observedAttributes() {
		return [...HTMLCustomInputElement.observedAttributes, 'checked'];
	}
});
