import { createIframe } from '../js/std-js/elements.js';
import { getString, setString, getBool, setBool, getInt, setInt } from '../js/std-js/attrs.js';

function render(el) {
	const { shadowRoot, user, pen, theme, loading, tab, height, editable, clickToLoad } = el;
	const src = new URL(`https://codepen.io/${user}/embed/${clickToLoad ? 'preview/' : '/'}${pen}`);

	src.searchParams.set('default-tab', tab);
	src.searchParams.set('theme-id', theme);
	
	if (editable) {
		src.searchParams.set('editable', 'true');
	}
	const iframe = createIframe(src, {
		loading, height,
		sandbox: ['allow-scripts', 'allow-popups'],
		part: ['embed'],
	});

	iframe.allowTransparency = 'true';
	iframe.allowFullscreen = 'true';
	iframe.style.setProperty('width', '100%');

	shadowRoot.replaceChildren(iframe);
}
customElements.define('codepen-embed', class HTMLCodePenEmbedElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}
	
	connectedCallback() {
		render(this);
		this.dispatchEvent(new Event('connected'));
	}
	
	attributeChangedCallback() {
		if (this.isConnected && this.shadowRoot.childElementCount !== 0) {
			render(this);
		}
	}
	
	get clickToLoad() {
		return getBool(this, 'clicktoload');
	}
	
	set clickToLoad(val) {
		setBool(this, 'clicktoload', val);
	}
	
	get editable() {
		return getBool(this, 'editable');
	}
	
	set editable(val) {
		setBool(this, 'editable', val);
	}
	
	get height() {
		return getInt(this, 'height', { fallback: 300 });
	}
	
	set height(val) {
		setInt(this, 'height', val, { min: 0 });
	}
	
	get loading() {
		return getString(this, 'loading', { fallback: 'lazy' });
	}
	
	set loading(val) {
		setString(this, 'loading', val);
	}
	
	get pen() {
		return getString(this, 'pen');
	}
	
	set pen(val) {
		setString(this, 'pen');
	}
	
	get tab() {
		return getString(this, 'tab', { fallback: 'result' });
	}
	
	set tab(val) {
		setString(this, 'tab', val);
	}
	
	get theme() {
		return getString(this, 'theme', { fallback: 'default' });
	}
	
	set theme(val) {
		setString(this, 'theme', val);
	}
	
	get user() {
		return getString(this, 'user');
	}
	
	set user(val) {
		setString(this, 'user', val);
	}
	
	static get observedAttributes() {
		return ['user', 'pen', 'tab', 'editable', 'height', 'theme', 'loading'];
	}
	
	static getPen({ user, pen, tab = 'result', editable = false, theme = 'default', loading = 'lazy', clickToLoad = false, height = 300 }) {
		const el = new HTMLCodePenEmbedElement();
		el.loading = loading;
		el.user = user;
		el.pen = pen;
		el.tab = tab;
		el.editable = editable;
		el.theme = theme;
		el.clickToLoad = clickToLoad;
		el.height = height;
		
		return el;
	}
});
