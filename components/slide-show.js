async function sleep(ms = 1000) {
	await new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function visible() {
	if (document.visibilityState === 'hidden') {
		await new Promise(resolve => {
			document.addEventListener('visibilitychange', () => resolve());
		}, {
			once: true,
		});
	}
}

customElements.define('slide-show', class HTMLSlideShowElement extends HTMLElement {
	constructor() {
		super();
		this._shadow = this.attachShadow({mode: 'closed'});
		fetch(new URL('./slide-show.html', import.meta.url)).then(async resp => {
			const html = await resp.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			this._shadow.append(...doc.head.children, ...doc.body.children);
			this._shadow.querySelectorAll('[data-action]').forEach(btn => {
				btn.addEventListener('click', ({target}) => {
					const action = target.closest('[data-action]').dataset.action;
					this.dispatchEvent(new CustomEvent('userchange', {detail: action}));
				}, {
					passive: true,
				});
			});

			const currentSlot = this._shadow.querySelector('slot[name="current-img"]');
			this.addEventListener('dblclick', () => this.toggleAttribute('playing'));

			if (currentSlot.assignedNodes().length === 0) {
				const imgs = this.images;

				if (imgs.length !== 0) {
					const current = imgs[0].cloneNode(true);
					current.slot = 'current-img';
					this.append(current);
				}
			}

			this.dispatchEvent(new Event('ready'));
		});

		Promise.resolve().then(async () => {
			/**
			 * Check for amimation support & reduced motion preferences
			 */
			await this.ready;
			const anim = Element.prototype.animate instanceof Function && Animation.prototype.hasOwnProperty('finished')
			&& ! matchMedia('(prefers-reduced-motion: reduce)').matches;

			if (! anim) {
				this._shadow.querySelector('.img-container').classList.add('animated');
			}

			for await(const img of await this.loopImages()) {
				const copy = img.cloneNode(true);
				const currentSlot = this._shadow.querySelector('slot[name="current-img"]');
				copy.slot = 'current-img';
				copy.hidden = false;
				const current = currentSlot.assignedNodes();

				if (anim) {
					const duration = this.duration;
					this.prepend(copy);
					await Promise.all([
						...current.map(el => el.animate([{
							transform: 'none',
							opacity: 1,
						}, {
							transform: 'translateX(100%) scale(0.2) rotate(0.02turn)',
							opacity: 0,
						}], {
							duration,
							easing: 'ease-in-out',
							fill: 'forwards',
						}).finished),
						copy.animate([{
							transform: 'translateX(-100%) scale(0.2) rotate(0.02turn)',
							opacity: 0,
						}, {
							transform: 'none',
							opacity: 1,
						}], {
							duration,
							easing: 'ease-in-out',
							fill: 'forwards',
						}).finished,
					]);
					current.forEach(el => el.remove());
				} else {
					current.forEach(el => el.remove());
					this.append(copy);
				}
				this.dispatchEvent(new Event('imgchange'));
			}
		});
	}

	get duration() {
		return parseInt(this.getAttribute('duration')) || 400;
	}

	get interval() {
		return parseInt(this.getAttribute('interval')) || 5000;
	}

	set interval(val) {
		if (typeof val !== 'number' || Number.isNaN(val) || val < 1) {
			throw new Error('Invalid interval given');
		} else {
			this.setAttribute('interval', val);
		}
	}

	get images() {
		return this._shadow.getElementById('images').assignedNodes();
	}

	get paused() {
		return ! this.hasAttribute('playing');
	}

	get ready() {
		return new Promise(resolve => {
			if (this._shadow.childElementCount === 0) {
				this.addEventListener('ready', () => resolve(), {once: true});
			} else {
				resolve();
			}
		});
	}

	pause() {
		this.removeAttribute('playing');
	}

	play() {
		this.setAttribute('playing', '');
	}

	async playing() {
		if (this.paused) {
			await new Promise(resolve => {
				this.addEventListener('playing', () => resolve(this));
			}, {
				once: true,
			});
		}
	}

	loopImages() {
		return (async function* imgGenerator() {
			await this.ready;

			while (true) {
				const images = this.images;
				let i = 0;

				for (const img of images) {
					img.decoding = 'auto';

					yield await Promise.race([
						Promise.all([
							this.playing(),
							visible(),
							img.decode instanceof Function ? img.decode() : Promise.resolve(),
							sleep(this.interval),
						]).then(() => {
							i === images.length - 1 ? i = 0 : i++;
							return img;
						}),
						new Promise(resolve => {
							function callback(event) {
								if (event.detail === 'prev') {
									i === 0 ? i = images.length - 1 : i--;
									resolve(images[i]);
								} else if (event.detail === 'next') {
									i === images.length - 1 ? i = 0 : i++;
									resolve(images[i]);
								} else {
									resolve(this.images[0]);
								}
							}

							callback.bind(this);

							this.addEventListener('imgchange', () => {
								this.removeEventListener('userchange', callback);
							}, {
								once: true,
							});

							this.addEventListener('userchange', callback, {once: true});
						}),
					]);
				}
			}
		}).bind(this)();
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
		case 'playing':
			if (newVal === null) {
				this.dispatchEvent(new Event('paused'));
			} else {
				this.dispatchEvent(new Event('playing'));
			}
			break;

		case 'width':
			this.ready.then(() => {
				this._shadow.querySelector('[part~="container"]')
					.style.setProperty('--slideshow-width', newVal);
			});
			break;

		case 'height':
			this.ready.then(() => {
				this._shadow.querySelector('[part~="container"]')
					.style.setProperty('--slideshow-height', newVal);
			});
			break;
		}
	}

	static get observedAttributes() {
		return [
			'playing',
			'width',
			'height',
		];
	}
});
