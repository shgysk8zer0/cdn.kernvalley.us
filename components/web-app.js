customElements.define('web-app', class HTMLWebAppElement extends HTMLHtmlElement {
	get title() {
		return document.title;
	}

	set title(title) {
		document.title = title;
	}

	get description() {
		const el = this.querySelector('meta[name="description"]');
		return el instanceof HTMLMetaElement ? el.content : null;
	}

	set description(text) {
		[...this.querySelectorAll('meta[name="description"], meta[itemprop="description"]')]
			.forEach(el => el.content = text);
	}

	get keywords() {
		const el = this.querySelector('meta[name="keywords"]');
		return el instanceof HTMLMetaElement
			? el.content.split(',').map(kw => kw.trim())
			: [];
	}

	set keywords(text) {
		[...this.querySelectorAll('meta[name="keywords"], meta[itemprop="keywords"]')]
			.forEach(el => el.content = text);
	}


	get ready() {
		return new Promise(resolve => {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => resolve(), {once: true});
			} else {
				resolve();
			}
		});
	}

	get loaded() {
		return new Promise(resolve => {
			if (document.readyState === 'complete') {
				resolve();
			} else {
				window.addEventListener('load', () => resolve(), {once: true});
			}
		});
	}

	supports(tagName) {
		return ! (document.createElement(tagName) instanceof HTMLUnknownElement);
	}

	async import(src) {
		const parser = new DOMParser();
		const resp = await fetch(src);
		if (resp.ok) {
			const html = await resp.text();
			const frag = document.createDocumentFragment();
			const {head, body} = parser.parseFromString(html, 'text/html');
			frag.append(...head.children, ...body.children);
			return frag;
		} else {
			throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
		}
	}
}, {extends: 'html'});
