import HTMLCustomElement from './custom-element.js';

export default class HTMLSchemaElement extends HTMLCustomElement {
	get itemprop() {
		return this.getAttribute('itemprop');
	}

	set itemprop(val) {
		this.setAttribute('itemprop', val);
	}

	get itemscope() {
		return this.hasAttribute('itemscope');
	}

	set itemscope(val) {
		this.toggleAttribute('itemscope', val);
	}

	get itemtype() {
		return this.getAttribute('itemtype');
	}

	set itemtype(val) {
		this.setAttribute('itemtype', val);
	}
}
