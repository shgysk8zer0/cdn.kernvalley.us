import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createElement } from '../../js/std-js/elements.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getBool, setBool } from '../../js/std-js/attrs.js';
// import { HTMLElementWithInternals, STATES } from './with-internals.js';
import { STATES } from './with-internals.js';

const protectedData = new WeakMap();

function setValidity(el) {
	const { internals } = protectedData.get(el);

	if (el.disabled || (! el.required || el.checked)) {
		internals.setValidity({}, '');
		internals.states.delete('--invalid');
	} else {
		internals.setValidity({ valueMissing: true }, 'This input is required');
		internals.states.add('--invalid');
	}
}

registerCustomElement('input-toggle', class HTMLInputToggleElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const internals = this.attachInternals();
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
	}

	attributeChangedCallback(name, oldVal, newVal) {
		const { internals } = protectedData.get(this);

		switch(name) {
			case 'checked':
				if (typeof newVal === 'string') {
					internals.states.add(STATES.checked);
					internals.ariaChecked = 'true';
					internals.setFormValue(true);
				} else {
					internals.states.delete(STATES.checked);
					internals.ariaChecked = 'false';
					internals.setFormValue(false);
				}

				setValidity(this);
				break;

			case 'required':
				if (typeof newVal === 'string') {
					internals.states.add(STATES.required);
					internals.ariaRequired = 'true';
				} else {
					internals.states.delete(STATES.required);
					internals.ariaRequired = 'false';
				}
				setValidity(this);
				break;

			case 'disabled':
				setValidity(this);
				if (typeof newVal === 'string') {
					internals.ariaDisabled = 'true';
					internals.states.add(STATES.disabled);
				} else {
					internals.ariaDisabled = 'false';
					internals.states.delete(STATES.disabled);
				}
				break;

			case 'readonly':
				if (typeof newVal === 'string') {
					internals.ariaReadOnly = 'true';
					internals.states.add(STATES.readOnly);
				} else {
					internals.ariaReadOnly = 'false';
					internals.states.delete(STATES.readOnly);
				}
		}
	}

	formAssociatedCallback(form) {
		console.log(form);
	}

	connectedCallback() {
		const { internals } = protectedData.get(this);

		if (internals._associateForm instanceof Function) {
			internals._associateForm(this.closest('form'), this);
		}

		internals.ariaChecked = this.checked ? 'true' : 'false';
		internals.ariaRequired = this.required ? 'true' : 'false';
		internals.ariaDisabled = this.disabled ? 'true' : 'false';
		internals.ariaReadOnly = this.readonly ? 'true' : 'false';

		internals.form.addEventListener('submit', event => {
			event.preventDefault();
			const data = new FormData(event.target);
			console.log(data);
		});
	}

	disconnectedCallback() {
		const { internals } = protectedData.get(this);

		if (internals._associateForm instanceof Function) {
			internals._associateForm(null, this);
		}
	}

	checkValidity() {
		return protectedData.get(this).internals.checkValidity();
	}

	reportValidity() {
		return protectedData.get(this).internals.reportValidity();
	}

	get checked() {
		return getBool(this, 'checked');
	}

	set checked(val) {
		setBool(this, 'checked', val);
	}

	get disabled() {
		return getBool(this, 'disabled');
	}

	set disabled(val) {
		setBool(this, 'disabled');
	}

	get form() {
		return protectedData.get(this).internals.form;
	}

	get labels() {
		return protectedData.get(this).internals.labels;
	}

	get required() {
		return getBool(this, 'required');
	}

	set required(val) {
		setBool(this, 'required');
	}

	get validationMessage() {
		return protectedData.get(this).internals.validationMessage;
	}

	get validity() {
		return protectedData.get(this).internals.validity;
	}

	get willValidate() {
		return protectedData.get(this).internals.willValidate;
	}

	static get observedAttributes() {
		return ['required', 'disabled', 'checked', 'readonly'];
	}

	static get formAssociated() {
		return true;
	}
});
