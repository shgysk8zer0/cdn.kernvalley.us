import { getBool, setBool, getString, setString, getInt, setInt } from '../../js/std-js/attrs.js';
const attachInternals = HTMLElement.prototype.attachInternals;

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
	attachInternals() {
		const internals = attachInternals.call(this);
		protectedData.set(this, internals);
		return internals;
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

	// Call `super.connectedCallback()` when overriding
	connectedCallback() {
		if (! protectedData.has(this)) {
			this.attachInternals();
		}

		const internals = protectedData.get(this);

		if (! (typeof internals.role === 'string' || typeof this.role === 'string')) {
			this.role = 'input';
		}

		if (! this.hasAttribute('tabindex')) {
			this.tabIndex = 0;
		}

		if (internals._associateForm instanceof Function) {
			internals._associateForm(this.closest('form'), this);
		}
	}

	// Call `super.disconnectedCallback()` when overriding
	disconnectedCallback() {
		const internals = protectedData.get(this);

		if (internals._associateForm instanceof Function) {
			internals._associateForm(null, this);
		}
	}

	// formResetCallback()
	// formAssociatedCallback(form)
	// formStateRestoreCallback(state, mode ["restore" | "autocomplete"])

	// Call `super.formDisabledCallback(disabled)` when overriding
	formDisabledCallback(disabled) {
		if (disabled) {
			protectedData.get(this).states.add(STATES.disabled);
		} else {
			protectedData.get(this).states.delete(STATES.disabled);
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

	get internals() {
		return protectedData.get(this);
	}

	get labels() {
		return protectedData.get(this).labels;
	}

	get maxLength() {
		return getInt(this, 'maxlength', { min: 0 });
	}

	set maxLength(val) {
		setInt(this, 'maxLength', val, { min: 0 });
	}

	get minLength() {
		return getInt(this, 'minlength', { min: 0 });
	}

	set minLength(val) {
		setInt(this, 'minLength', val, { min: 0 });
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
		return ['required', 'readonly'];
	}

	static get formAssociated() {
		return true;
	}

	static get STATES() {
		return STATES;
	}
}
