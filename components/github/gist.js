const protectedData = new WeakMap();

function render(target) {
	const { user, gist, file, height, width } = target;
	const { shadow } = protectedData.get(target);
	const iframe = document.createElement('iframe');
	const script = document.createElement('script');
	const link = document.createElement('link');
	const src = new URL(`/${user}/${gist}.js`, 'https://gist.github.com');
	const controller = new AbortController();
	link.rel = 'preconnect';
	link.href = 'https://github.githubassets.com';

	iframe.addEventListener('load', () => {
		target.dispatchEvent(new Event('load'));
		controller.abort();
	}, {
		signal: controller.signal,
		once: true,
	});

	iframe.addEventListener('error', () => {
		target.dispatchEvent(new Event('error'));
		controller.abort();
	}, {
		signal: controller.signal,
		once: true,
	});

	if (typeof file === 'string' && file.length !== 0) {
		src.searchParams.set('file', file);
	}

	script.referrerPolicy = 'no-referrer';
	// script.crossOrigin = 'anonymous';
	script.src = src.href;

	iframe.referrerPolicy = 'no-referrer';
	iframe.sandbox.add('allow-scripts');
	iframe.frameBorder = 0;

	if (! Number.isNaN(width)) {
		iframe.width = width;
	}

	if (! Number.isNaN(height)) {
		iframe.height = height;
	}

	if ('part' in iframe) {
		iframe.part.add('embed');
	}

	iframe.srcdoc = `<!DOCTYPE html><html><head>${link.outerHTML}</head><body>${script.outerHTML}</body></html>`;
	shadow.append(iframe);
}

const observer = new IntersectionObserver((entries, observer) => {
	entries.forEach(({ target, isIntersecting }) => {
		if (isIntersecting && protectedData.has(target)) {
			observer.unobserve(target);
			render(target);
			protectedData.delete(target);
		}
	});
}, {
	rootMargin: `${Math.round(0.5 * screen.height)}px`,
	root: document.body,
});

customElements.define('github-gist', class HTMLGitHubGistElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'open' });
		protectedData.set(this, { shadow });
	}

	connectedCallback() {
		switch(this.loading) {
			case 'lazy':
				observer.observe(this);
				break;

			default:
				render(this);
		}
	}

	get file() {
		return this.getAttribute('file');
	}

	set file(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('file', val);
		} else {
			this.removeAtttribute('file');
		}
	}

	get gist() {
		return this.getAttribute('gist');
	}

	set gist(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('gist', val);
		} else {
			this.removeAtttribute('gist');
		}
	}

	get height() {
		return parseInt(this.getAttribute('height'));
	}

	set height(val) {
		if (Number.isSafeInteger(val) && val > 0) {
			this.setAttribute('height', val);
		} else {
			this.removeAttribute('height');
		}
	}

	get loading() {
		return this.getAttribute('loading') || 'eager';
	}

	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.removeAttribute('val');
		}
	}

	get user() {
		return this.getAttribute('user');
	}

	set user(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('user', val);
		} else {
			this.removeAtttribute('user');
		}
	}

	get width() {
		return parseInt(this.getAttribute('width'));
	}

	set width(val) {
		if (Number.isSafeInteger(val) && val > 0) {
			this.setAttribute('width', val);
		} else {
			this.removeAttribute('width');
		}
	}
});
