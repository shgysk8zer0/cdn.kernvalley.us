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

if ('customElements' in self && ! (customElements.get('slide-show') instanceof HTMLElement)) {
	customElements.define('slide-show', class HTMLSlideShowElement extends HTMLElement {
		constructor() {
			super();
			this.attachShadow({mode: 'open'});

			fetch(new URL('./template.html', import.meta.url)).then(async resp => {
				const html = await resp.text();
				const parser = new DOMParser();
				const doc = parser.parseFromString(html, 'text/html');
				const style = document.createElement('link');
				style.href = new URL('./style.css', import.meta.url);
				style.rel = 'stylesheet';

				this.shadowRoot.append(style, ...doc.head.children, ...doc.body.children);

				this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
					btn.addEventListener('click', ({target}) => {
						if (this.contains(target)) {
							const action = target.closest('[slot]').assignedSlot.closest('[data-action]').dataset.action;
							switch(action) {
							case 'next':
								this.next();
								break;

							case 'prev':
								this.prev();
								break;

							default: throw new Error(`Unhandled action requested: ${action}`);
							}
						} else {
							const action = target.closest('[data-action]').dataset.action;
							switch(action) {
							case 'next':
								this.next();
								break;

							case 'prev':
								this.prev();
								break;

							default: throw new Error(`Unhandled action requested: ${action}`);
							}
						}
					}, {
						passive: true,
					});
				});

				const currentSlot = this.shadowRoot.querySelector('slot[name="displayed"]');

				if (currentSlot.assignedNodes().length === 0) {
					const slides = this.slides;

					if (slides.length !== 0) {
						const current = slides[0].cloneNode(true);
						current.slot = 'displayed';
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
					this.shadowRoot.querySelector('.slide-container').classList.add('animated');
				}

				for await(const slide of await this.loopSlides()) {
					const copy = slide.cloneNode(true);
					const currentSlot = this.shadowRoot.querySelector('slot[name="displayed"]');
					const current = currentSlot.assignedNodes();
					copy.slot = 'displayed';
					copy.hidden = false;

					if (anim) {
						const duration = this.duration;
						requestAnimationFrame(() => this.prepend(copy));
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

						requestAnimationFrame(() => current.forEach(el => el.remove()));

					} else {
						requestAnimationFrame(() => {
							current.forEach(el => el.remove());
							this.append(copy);
						});
					}
					this.dispatchEvent(new Event('slidechange'));
				}
			});
		}

		get currentSlide() {
			if (this.shadowRoot.childElementCount > 0) {
				const displayed = this.shadowRoot.querySelector('slot[name="displayed"]');
				return displayed.length !== 0 ? displayed[0] : null;
			} else {
				return null;
			}
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

		get slides() {
			return this.shadowRoot.getElementById('slides').assignedNodes();
		}

		get paused() {
			return ! this.hasAttribute('playing');
		}

		get ready() {
			return new Promise(resolve => {
				if (this.shadowRoot.childElementCount === 0) {
					this.addEventListener('ready', () => resolve(), {once: true});
				} else {
					resolve();
				}
			});
		}

		async next() {
			this.dispatchEvent(new CustomEvent('userchange', {detail: 'next'}));
		}

		async prev() {
			this.dispatchEvent(new CustomEvent('userchange', {detail: 'prev'}));
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

		loopSlides() {
			return (async function* slideGenerator() {
				await this.ready;

				while (true) {
					const slides = this.slides;
					let i = 0;

					for (const slide of slides) {
						slide.decoding = 'auto';

						yield await Promise.race([
							Promise.all([
								this.playing(),
								visible(),
								slide.decode instanceof Function ? slide.decode() : Promise.resolve(),
								sleep(this.interval),
							]).then(() => {
								i === slides.length - 1 ? i = 0 : i++;
								return slide;
							}),
							new Promise(resolve => {
								function callback(event) {
									if (event.detail === 'prev') {
										i === 0 ? i = slides.length - 1 : i--;
										resolve(slides[i]);
									} else if (event.detail === 'next') {
										i === slides.length - 1 ? i = 0 : i++;
										resolve(slides[i]);
									} else {
										resolve(this.slides[0]);
									}
								}

								callback.bind(this);

								this.addEventListener('slidechange', () => {
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
					this.shadowRoot.querySelector('[part~="container"]')
						.style.setProperty('--slideshow-width', newVal);
				});
				break;

			case 'height':
				this.ready.then(() => {
					this.shadowRoot.querySelector('[part~="container"]')
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
}

