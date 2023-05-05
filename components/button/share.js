import { HTMLCustomButtonElement } from './custom.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { getString, setString, getURL, setURL } from '../../js/std-js/attrs.js';
import { setUTMParams } from '../../js/std-js/utility.js';
import { getDescription } from '../../js/std-js/meta.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { GET } from '../../js/std-js/http.js';

const protectedData = new WeakMap();

function log({ url: eventAction, title: eventLabel, hitType = 'event',
	transport = 'beacon', eventCategory = 'share-button'
}) {
	if (hasGa()) {
		send({ hitType, eventCategory, eventAction, eventLabel, transport });
	}
}

async function getFiles(file) {
	if (! (file instanceof URL) || ! (navigator.canShare instanceof Function)) {
		return [];
	} else {
		try {
			const resp = await GET(file);

			if (! resp.ok) {
				throw new Error(`Failed fetching ${file} [${resp.status} ${resp.statusText}]`);
			} else if (! resp.headers.has('Content-Type')) {
				throw new Error(`Unknown Content-Type for ${file}`);
			} else {
				const name = file.pathname.split('/').at(-1);
				const type = resp.headers.get('Content-Type').split(';')[0];
				const files = [new File([await resp.blob()], name, { type })];
				return navigator.canShare({ title: 'test', files }) ? files : [];
			}
		} catch(err) {
			console.error(err);
			return [];
		}
	}
}

async function share({ currentTarget, type, key, isTrusted }) {
	if (isTrusted && ! currentTarget.disabled && type === 'click' || (type === 'keydown' && key === ' ')) {
		const { internals } = protectedData.get(currentTarget);
		const { shareTitle: title, text, campaign, content, medium, source, term , file } = currentTarget;
		const url = setUTMParams(this.url, { campaign, content, medium, source, term });

		internals.ariaPressed = 'true';
		internals.ariaBusy = 'true';
		this.disabled = true;
		const files = await getFiles(file);
		await navigator.share({ title, text, url, files }).then(() => log({ url, title })).catch(console.error);
		internals.ariaPressed = 'false';
		internals.ariaBusy = 'false';
		this.disabled = false;
	}
}

registerCustomElement('share-button', class HTMLShareButtonElement extends HTMLCustomButtonElement {
	constructor() {
		super();
		protectedData.set(this, { internals: this.attachInternals() });
	}

	connectedCallback() {
		super.connectedCallback();
		const { internals } = protectedData.get(this);
		internals.ariaPressed = 'false';

		if (! this.hasAttribute('aria-label')) {
			internals.ariaLabel = 'Share this';
		}

		if (HTMLShareButtonElement.supported) {
			internals.ariaHasPopup = 'dialog';
			this.disabled = false;
			this.addEventListener('click', share);
			this.addEventListener('keydown', share);
		} else {
			this.disabled = true;
		}
	}

	get canShare() {
		return navigator.canShare instanceof Function && navigator.canShare({
			title: this.shareTitle,
			text: this.text,
			url: this.url,
		});
	}

	get campaign() {
		return getString(this, 'campaign');
	}

	set campaign(val) {
		setString(this, 'campaign', val);
	}

	get content() {
		return getString(this, 'content', { fallback: 'share-button' });
	}

	set content(val) {
		setString(this, 'content', val);
	}

	get file() {
		return getURL(this, 'file');
	}

	set file(val) {
		setString(this, 'file', val);
	}

	get medium() {
		return getString(this, 'medium', { fallback: 'share' });
	}

	set medium(val) {
		setString(this, 'medium', val);
	}

	get shareTitle() {
		return getString(this, 'sharetitle', { fallback: document.title });
	}

	set shareTitle(val) {
		setString(this, 'sharetitle', val);
	}

	get source() {
		return getString(this, 'source');
	}

	set source(val) {
		setString(this, 'source', val);
	}

	get term() {
		return getString(this, 'term');
	}

	set term(val) {
		setString(this, 'term', val);
	}

	get text() {
		return getString(this, 'text', { fallback: getDescription() });
	}

	set text(val) {
		setString(this, 'text', val);
	}

	get url() {
		return getURL(this, 'url');
	}

	set url(val) {
		setURL(this, 'url', val);
	}

	static get supported() {
		return navigator.share instanceof Function;
	}
});
