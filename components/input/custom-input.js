import { getBool, setBool, getString, setString } from '../../js/std-js/attrs.js';

const protectedData = new WeakMap();

export const STATES = {
	checked: '--checked',
	required: '--required',
	disabled: '--disabled',
	invalid: '--invalid',
	valid: '--valid',
	loading: '--loading',
	readOnly: '--readonly',
};

export class HTMLCustomInputElement extends HTMLElement {
	// call `super(function(internals){...})
	// Must be `function()`, not arrow function to use `this`
	constructor(callback) {
		super();
		const internals = this.attachInternals();

		protectedData.set(this, internals);

		if (callback instanceof Function) {
			callback.call(this, internals);
		}
	}

	// call `super.attributeChangedCallback(name, oldVal, newVal)`
	attributeChangedCallback(name, oldVal, newVal) {
		const internals = protectedData.get(this);

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

	// call `super.connectedCallback()`
	connectedCallback() {
		const internals = protectedData.get(this);

		if (internals._associateForm instanceof Function) {
			internals._associateForm(this.closest('form'), this);
		}
	}

	// call `super.disconnectedCallback()`
	disconnectedCallback() {
		const internals = protectedData.get(this);

		if (internals._associateForm instanceof Function) {
			internals._associateForm(null, this);
		}
	}

	get disabled() {
		return getBool(this, 'disabled');
	}

	set disabled(val) {
		setBool(this, 'disabled', val);
	}

	get form() {
		return protectedData.get(this).form;
	}

	get labels() {
		return protectedData.get(this).labels;
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
		return protectedData.get(this).validationMessage;
	}

	get validity() {
		return protectedData.get(this).validity;
	}

	get willValidate() {
		return protectedData.get(this).willValidate;
	}

	// `[...HTMLCustomInputElement.observedAttributes, ...]`
	static get observedAttributes() {
		return ['required', 'disabled', 'readonly'];
	}

	static get formAssociated() {
		return true;
	}

	static get STATES() {
		return STATES;
	}
}
