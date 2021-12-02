const protectedData = new WeakMap();

async function render(target) {
	const { shadow, timeout } = protectedData.get(target);

	if (Number.isInteger(timeout)) {
		cancelAnimationFrame(timeout);
		protectedData.set(target, { shadow, timeout: null });
	}
	
	protectedData.set(target, {
		timeout: requestAnimationFrame(() => {
			const { user, gist, file, height, width } = target;
			const iframe = document.createElement('iframe');
			const script = document.createElement('script');
			const parser = new DOMParser();
			const doc = parser.parseFromString('<!DOCTYPE html><html><head></head><body><script>document.querySelectorAll("a").forEach(function(a){a.target="_blank";})</script></body></html>', 'text/html');
			const link = document.createElement('link');
			const src = new URL(`/${user}/${gist}.js`, 'https://gist.github.com');
			link.rel = 'preconnect';
			link.href = 'https://github.githubassets.com';

			if (typeof file === 'string' && file.length !== 0) {
				src.searchParams.set('file', file);
			}

			script.src = src.href;
			
			doc.head.append(link);
			doc.body.prepend(script);

			iframe.referrerPolicy = 'no-referrer';
			iframe.sandbox.add('allow-scripts', 'allow-popups');
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

			iframe.srcdoc = `<!DOCTYPE html><html>${doc.head.outerHTML}${doc.body.outerHTML}</html>`;
			console.log(iframe.srcdoc);
			shadow.replaceChildren(iframe);
			target.dispatchEvent(new Event('rendered'));
			protectedData.set(target, { shadow, timeout: null });
		}),
		shadow,
	}, 100);
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
	rootMargin: `${Math.floor(0.5 * Math.max(screen.height, 200))}px`,
});

customElements.define('github-gist', class HTMLGitHubGistElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'open' });
		protectedData.set(this, { shadow, timeout: null });
	}
	
	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get file() {
		return this.getAttribute('file');
	}

	set file(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('file', val);
		} else {
			this.removeAttribute('file');
		}
	}

	get gist() {
		return this.getAttribute('gist');
	}

	set gist(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('gist', val);
		} else {
			this.removeAttribute('gist');
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
	
	get rendered() {
		return new Promise(async resolve => {
			await this.whenConnected;
			const { shadow } = protectedData.get(this);
			
			if (shadow.childElementCount === 0) {
				this.addEventListener('rendered', () => resolve(), { once: true });
			} else {
				resolve();
			}
		});
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
	
	get whenConnected() {
		return new Promise(resolve => {
			if (this.isConnected) {
				resolve();
			} else {
				this.addEventListener('connected', () => resolve(), { once: true });
			}
		});
	}
	
	async attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			await this.whenConnected;

			switch(name) {
				case 'loading':
					if (protectedData.get(this).shadow.childElementCount === 0) {
						if (newValue === 'lazy') {
							observer.observe(this);
						} else {
							observer.unobserve(this);
							render(this);
						}
					}
					break;

				case 'user':
				case 'gist':
				case 'file':
					if (this.loading !== 'lazy') {
						render(this);
					}
					break;

				case 'width':
				case 'height':
					this.rendered.then(() => {
						const iframe = protectedData.get(this).shadow.querySelector('iframe');

						if (typeof newValue === 'string') {
							iframe.setAttribute(name, newValue);
						} else {
							iframe.removeAttribute(name);
						}
					});
					break;

				default:
					throw new DOMException(`Unhandled attribute changed: ${name}`);
			}
		}
	}
	
	static get observedAttributes() {
		return ['user', 'gist', 'file', 'loading', 'width', 'height'];
	}
});
