import { getBool, setBool, getString, setString } from '../../js/std-js/attrs.js';

const symbols = {
	internals: Symbol('internals'),
};
export const STATES = {
	checked: '--checked',
	required: '--required',
	disabled: '--disabled',
	invalid: '--invalid',
	valid: '--valid',
	loading: '--loading',
	readOnly: '--readonly',
};

export class HTMLElementWithInternals extends HTMLElement {
	constructor(callback) {
		super();
		const internals = this.attachInternals();

		Object.defineProperty(this, symbols.internals, {
			value: internals,
			enumerable: false,
			configurable: false,
		});

		if (callback instanceof Function) {
			callback(internals);
		}
	}

	attributeChangedCallback(name, oldVal, newVal) {
		const internals = this[symbols.internals];

		switch(name) {
			case 'required':
				if (typeof newVal === 'string') {
					internals.states.add(STATES.required);
					internals.ariaRequired = 'true';
				} else {
					internals.states.delete(STATES.required);
					internals.ariaRequired = 'false';
				}
				break;

			case 'disabled':
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

	connectedCallback() {
		const internals = this[symbols.internals];

		if (internals._associateForm instanceof Function) {
			internals._associateForm(this.closest('form'), this);
		}
	}

	disconnectedCallback() {
		const internals = this[symbols.internals];

		if (internals._associateForm instanceof Function) {
			internals._associateForm(null, this);
		}
	}

	get disabled() {
		return getBool(this, 'disabled');
	}

	set disabled(val) {
		setBool(this, 'disabled');
	}

	get form() {
		return this[symbols.internals].form;
	}

	get labels() {
		return this[symbols.internals].labels;
	}

	get name() {
		return getString(this, 'name');
	}

	set name(val) {
		setString(this, 'name');
	}

	get required() {
		return getBool(this, 'required');
	}

	set required(val) {
		setBool(this, 'required');
	}

	get validationMessage() {
		return this[symbols.internals].validationMessage;
	}

	get validity() {
		return this[symbols.internals].validity;
	}

	get willValidate() {
		return this[symbols.internals].willValidate;
	}

	static get observedAttributes() {
		return ['required', 'disabled', 'readonly'];
	}

	static get formAssociated() {
		return true;
	}
}
