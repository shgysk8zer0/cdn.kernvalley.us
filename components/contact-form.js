import { registerCustomElement, css, attr } from '../js/std-js/functions.js';
import { send } from '../js/std-js/slack.js';

function makeSlot(name, text) {
	const slot = document.createElement('slot');
	slot.name = name;

	if (typeof text === 'string') {
		slot.textContent = text;
	}
	return slot;
}

function makeSection({
	name,
	label,
	id,
	type = 'text',
	required = false,
	tag = 'input',
	placeholder = '',
	autocomplete = null,
	attributes = undefined,
}) {
	const div = document.createElement('div');
	const labelEl = document.createElement('label');

	labelEl.for = id;
	labelEl.append(makeSlot(`${name}-label`, label));
	const input = document.createElement(tag);

	if ('type' in input) {
		attr(input, { type });
	}

	input.name = name;
	input.required = required;
	input.placeholder = placeholder;

	if (typeof autocomplete === 'string') {
		input.autocomplete = autocomplete;
	}

	if (typeof attributes === 'object') {
		attr(input, attributes);
	}

	css(div, {
		'max-width': '100%',
		'overflow': 'auto',
		'margin': '4px',
		'box-sizing': 'border-box',
	});

	css(labelEl, {
		'display': 'block',
		'box-sizing': 'inherit',
	});

	css(input, {
		'display': 'block',
		'border-color': 'transparent',
		'border-width': '1px',
		'border-type': 'solid',
		'border-bottom-color': 'currentColor',
		'color': 'inherit',
		'background-color': 'transparent',
		'width': '99%',
		'box-sizing': 'border-box',
		'padding': '16px',
		'margin': '7px',
	});

	if ('part' in input) {
		input.part.add(name, 'input', `${name}-input`);
		labelEl.part.add('label');
	}

	div.append(labelEl, input);
	return div;
}

function buildForm() {
	const form = document.createElement('form');
	const submit = document.createElement('button');
	const reset = document.createElement('button');
	const btnContainer = document.createElement('div');
	const legend = document.createElement('legend');
	const fieldset = document.createElement('fieldset');

	legend.append(makeSlot('legend', 'Send Message to KernValley.US'));

	submit.type = 'submit';
	submit.append(makeSlot('submit-icon'), makeSlot('submit-text', 'Send'));

	reset.type = 'reset';
	reset.append(makeSlot('reset-icon'), makeSlot('reset-text', 'Cancel'));

	fieldset.append(
		legend,
		makeSection({ name: 'name', id: 'name', required: true, autocomplete: 'name',
			label: 'Name' }),
		makeSection({ name: 'email', id: 'email', type: 'email', required: true,
			autocomplete: 'email', label: 'Email' }),
		makeSection({ name: 'phone', id: 'phone', type: 'tel', autocomplete: 'tel',
			label: 'Phone' }),
		makeSection({ name: 'subject', id: 'subject', required: true, label: 'Subject' }),
		makeSection({ name: 'body', id: 'body', tag: 'textarea', required: true,
			label: 'Message' }),
	);

	css(form, {
		'max-width': '100%',
	});

	css(fieldset, {
		'border': 'none',
		'line-height': '1.7',
		'max-width': '100%',
	});

	css(submit, {
		'background-color':'#28a745',
		'color': '#fefefe',
		'border': 'none',
		'border-radius': '6px',
		'padding': '10px 6px',
		'flex-grow': '1',
		'max-width': '250px',
		'cursor': 'pointer',
	});

	css(reset, {
		'background-color': '#dc3545',
		'color': '#fefefe',
		'border': 'none',
		'border-radius': '6px',
		'padding': '10px 6px',
		'flex-grow': '1',
		'max-width': '250px',
		'cursor': 'pointer',
	});

	css(btnContainer, {
		'display': 'flex',
		'justify-content': 'space-evenly',
	});

	btnContainer.append(submit, reset);

	if ('part' in submit) {
		submit.part.add('button', 'submit');
		reset.part.add('button', 'reset');
		legend.part.add('legend');
	}

	form.append(fieldset, btnContainer);
	return form;
}

registerCustomElement('contact-form', class HTMLContactFormElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const form = buildForm();

		form.addEventListener('reset', () => this.dispatchEvent(new Event('reset')));

		form.addEventListener('submit', async event => {
			event.preventDefault();
			const form = event.target;
			const data = new FormData(form);
			const { success = false, body = {}} = await send(this.action, {
				name: data.get('name'),
				email: data.get('email'),
				phone: data.get('phone'),
				subject: data.get('subject'),
				body: data.get('body'),
			});

			if (success === true) {
				this.dispatchEvent(new Event('sent'));
				form.reset();
			} else if ('error' in body && typeof body.error.message === 'string') {
				this.dispatchEvent(new ErrorEvent('error', {
					error: new Error(body.error.message),
					message: body.error.message,
				}));
			} else {
				this.dispatchEvent(new ErrorEvent('error', {
					error: new Error('Error submitting form'),
					message: 'Error submitting form',
				}));
			}
		});

		shadow.append(form);
	}

	get action() {
		if (this.hasAttribute('action')) {
			return new URL(this.getAttribute('action'), document.baseURI);
		} else {
			return 'https://contact.kernvalley.us/api/slack';
		}
	}

	set action(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('action', val);
		} else {
			this.removeAttribute('action');
		}
	}
});
