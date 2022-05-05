import HTMLCustomElement from '../custom-element.js';
import { sleep } from '../../js/std-js/promises.js';
import { whenPageVisible } from '../../js/std-js/dom.js';
import { purify as policy } from '../../js/std-js/purify.js';

HTMLCustomElement.register('slide-show', class HTMLSlideShowElement extends HTMLCustomElement {
	constructor(...slides) {
		super();
		this.attachShadow({ mode: 'open' });

		slides.forEach(item => {
			if (item instanceof Element) {
				item.slot = 'slide';
				this.append(item);
			} else if ((typeof item === 'string') || item instanceof URL) {
				const img = document.createElement('img');
				img.src = item;
				img.slot = 'slide';
				img.decoding = 'async';
				img.loading = 'lazy';
				this.append(img);
			}
		});

		this.getTemplate('./components/slide-show/slide-show.html', { policy }).then(async tmp => {
			const actionHandler = async action => {
				switch (action) {
					case 'next':
						this.next();
						break;

					case 'prev':
						this.prev();
						break;

					case 'toggle-fullscreen':
						if (document.fullscreenElement === this) {
							document.exitFullscreen();
						} else {
							this.requestFullscreen();
						}
						break;
					case 'toggle-playback':
						if (this.paused) {
							this.play();
						} else {
							this.pause();
						}
						break;

					default: throw new Error(`Unhandled action requested: ${action}`);
				}
			};

			tmp.querySelectorAll('[data-action]').forEach(btn => {
				btn.addEventListener('click', ({ target }) => {
					if (this.contains(target)) {
						const action = target.closest('[slot]').assignedSlot
							.closest('[data-action]').dataset.action;
						actionHandler(action);
					} else {
						const action = target.closest('[data-action]').dataset.action;
						actionHandler(action);
					}
				}, {
					passive: true,
				});
			});

			this.shadowRoot.append(tmp);
			const displayed = await this.getSlotted('displayed');

			if (displayed.length === 0) {
				const slides = await this.slides;

				if (slides.length !== 0) {
					const slide = slides[0].cloneNode(true);

					if ('sizes' in slide) {
						slide.sizes = (document.fullscreenElement === this)
							? '100vw'
							: `${this.getBoundingClientRect().width}px`;
					}

					if ('loading' in slide) {
						slide.loading = 'auto';
					}

					slide.slot = 'displayed';
					this.append(slide);
				}
			}

			this.dispatchEvent(new Event('ready'));
		});

		Promise.resolve().then(async () => {
			/**
			 * Check for amimation support & reduced motion preferences
			 */
			await this.ready;
			const anim = Element.prototype.animate instanceof Function
				&& Animation.prototype.hasOwnProperty('finished')
				&& ! matchMedia('(prefers-reduced-motion: reduce)').matches;

			if (!anim) {
				this.shadowRoot.querySelector('.slide-container').classList.add('animated');
			}

			for await (const slide of await this.loopSlides()) {
				const current = await this.currentSlides;
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
								? 'translateX(-100%) scale(0.2) rotate(0.02turn)'
								: 'translateX(100%) scale(0.2) rotate(0.02turn)',
							opacity: 0,
						}], {
							duration,
							easing: 'ease-in-out',
							fill: 'forwards',
						}).finished),
						slide.animate([{
							transform: direction === 'normal'
								? 'translateX(100%) scale(0.2) rotate(0.02turn)'
								: 'translateX(-100%) scale(0.2) rotate(0.02turn)',
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
				this.dispatchEvent(new CustomEvent('slidechange', {detail: slide}));
			}
		});
	}

	get allowFullscreen() {
		return this.hasAttribute('allowfullscreen');
	}

	set allowFullscreen(val) {
		this.toggleAttribute('allowfullscreen', val);
	}

	get controls() {
		return this.hasAttribute('controls');
	}

	set controls(val) {
		this.toggleAttribute('controls', val);
	}

	get currentSlides() {
		return this.getSlotted('displayed');
	}

	get duration() {
		return parseInt(this.getAttribute('duration')) || 400;
	}

	set duration(val) {
		if (typeof val !== 'number') {
			val = parseInt(val);
		}

		if (Number.isNaN(val)) {
			throw new Error('Duration must be a number');
		} else {
			this.setAttribute('duratoin', val);
		}
	}

	get hasSlides() {
		return new Promise(async resolve => {
			const slot = await this.getSlot('slide');

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
		return this.getSlotted('slide');
	}

	get slideChanged() {
		return new Promise(async resolve => {
			await this.ready;
			const displayed = await this.getSlot('displayed');
			displayed.addEventListener('slotchange', () => resolve(), { once: true });
		});
	}

	get paused() {
		return !this.hasAttribute('playing');
	}

	async navigate({ dir = 'next', pause = true } = {}) {
		this.dispatchEvent(new CustomEvent('userchange', { detail: dir }));

		if (pause) {
			await this.slideChanged;
			this.pause();
		}
		await this.slideChanged;
	}

	async next(pause = false) {
		await this.navigate({dir: 'next', pause});
	}

	async prev(pause = true) {
		await this.navigate({dir: 'prev', pause});
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
				this.addEventListener('playing', () => resolve(this), { once: true });
			});
		}
	}

	loopSlides(i = 0, { signal } = {}) {
		return (async function* slideGenerator() {
			while (true) {
				const slides = await this.slides;

				while (i < slides.length) {
					let direction = 'normal';
					let slide = slides[i].cloneNode(true);
					// Keep copy of iterator index at beginning, before modifications
					const n = i;
					slide.decoding = 'auto';

					if ('sizes' in slide) {
						slide.sizes = (document.fullscreen && document.fullscreenElement === this)
							? '100vw'
							: `${parseInt(this.getBoundingClientRect().width)}px`;
					}

					yield await Promise.race([
						Promise.all([
							// Wait until slideshow is playing
							this.playing(),
							// And tab is visible
							whenPageVisible({ signal }),
							// And image is decoded / loaded, if applicable
							slide.decode instanceof Function ? slide.decode() : Promise.resolve(),
							// And slide interval has passed
							sleep(this.interval),
						]).then(() => {
							i === slides.length - 1 ? i = 0 : i++;
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

								if ('sizes' in slide) {
									slide.sizes = (document.fullscreenElement === this)
										? '100vw'
										: `${parseInt(this.getBoundingClientRect().width)}px`;
								}

								resolve(slide);
							}

							callback.bind(this);

							this.addEventListener('slidechange', () => {
								this.removeEventListener('userchange', callback);
							}, {
								once: true,
							});

							this.addEventListener('userchange', callback, { once: true });
						}),
					]);
				}
			}
		}).bind(this)();
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch (name) {
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
			
			case 'allowfullscreen':
				if (typeof newVal === 'string' && ! (HTMLElement.prototype.allowfullscreen instanceof Function)) {
					this.removeAttribute('allowfullscreen');
				}
				break;
		}
	}

	static get observedAttributes() {
		return [
			'allowfullscreen',
			'playing',
			'width',
			'height',
		];
	}
});
