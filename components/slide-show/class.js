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
				const html   = await resp.text();
				const parser = new DOMParser();
				const doc    = parser.parseFromString(html, 'text/html');
				const style  = document.createElement('link');
				style.href   = new URL('./style.css', import.meta.url);
				style.rel    = 'stylesheet';

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
					const current = this.currentSlides;
					const direction = slide.dataset.direction || 'normal';
					slide.loading = 'auto';
					slide.slot = 'displayed';
					slide.hidden = false;

					if (anim) {
						const duration = this.duration;
						requestAnimationFrame(() => this.prepend(slide));
						await Promise.all([
							...current.map(el => el.animate([{
								transform: 'none',
								opacity: 1,
							}, {
								transform: direction === 'normal'
									? 'translateX(100%) scale(0.2) rotate(0.02turn)'
									: 'translateX(-100%) scale(0.2) rotate(0.02turn)',
								opacity: 0,
							}], {
								duration,
								easing: 'ease-in-out',
								fill: 'forwards',
							}).finished),
							slide.animate([{
								transform: direction === 'normal'
									? 'translateX(-100%) scale(0.2) rotate(0.02turn)'
									: 'translateX(100%) scale(0.2) rotate(0.02turn)',
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
							this.append(slide);
						});
					}
					this.dispatchEvent(new Event('slidechange'));
				}
			});
		}

		get controls() {
			return this.hasAttribute('controls');
		}

		set controls(val) {
			this.toggleAttribute('controls', val);
		}

		get currentSlides() {
			if (this.shadowRoot.childElementCount > 0) {
				return this.shadowRoot.querySelector('slot[name="displayed"]').assignedNodes();
			} else {
				return [];
			}
		}

		get duration() {
			return parseInt(this.getAttribute('duration')) || 400;
		}

		get hasSlides() {
			return new Promise(async resolve => {
				await this.ready;
				const slot = this.shadowRoot.querySelector('slot[name="slide"]');

				if (slot.assignedNodes().length === 0) {
					const callback = event => {
						if (event.target.assignedNodes().length !== 0) {
							event.target.removeEventListener(event.type, callback);
							resolve();
						}
					};
					slot.addEventListener('slotchange', callback);
				} else {
					resolve();
				}
			});
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
			if (this.shadowRoot.childElementCount === 0) {
				return [];
			} else {
				return this.shadowRoot.getElementById('slides').assignedNodes();
			}
		}

		get slideChanged() {
			return new Promise(async resolve => {
				await this.ready;
				this.shadowRoot.querySelector('slot[name="displayed"]')
					.addEventListener('slotchange', () => resolve(), {once: true});
			});
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
			await this.slideChanged;
		}

		async prev() {
			this.dispatchEvent(new CustomEvent('userchange', {detail: 'prev'}));
			await this.slideChanged;
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
				let i = 0;

				while (true) {
					await this.hasSlides;
					const slides = this.slides;

					while (i < slides.length) {
						let direction = 'normal';
						let slide = slides[i];
						// Keep copy of iterator index at beginning, before modifications
						const n = i;
						slide.decoding = 'auto';
						yield await Promise.race([
							Promise.all([
								// Wait until slideshow is playing
								this.playing(),
								// And tab is visible
								visible(),
								// And image is decoded / loaded, if applicable
								slide.decode instanceof Function ? slide.decode() : Promise.resolve(),
								// And slide interval has passed
								sleep(this.interval),
							]).then(() => {
								i === slides.length - 1 ? i = 0 : i++;
								slide = slides[i];
								return slide;
							}),
							new Promise(resolve => {
								function callback(event) {
									if (event.detail === 'prev') {
										direction = 'reverse';
										// Set to previous index, or end if at the beginning
										n === 0 ? i = slides.length - 1 : i = n - 1;
									} else if (event.detail === 'next') {
										// Set to next index or back to beginning,
										// but only if index has not already been changed
										if (i === n) {
											n === slides.length - 1 ? i = 0 : i = n + 1;
										}
									} else {
										i = 0;
									}

									slide = slides[i].cloneNode(true);
									slide.dataset.direction = direction;
									resolve(slide);
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
