import { resizeImageFile, previewImgOnChange } from '/js/std-js/img-utils.js';
import { createImage, createElement } from '/js/std-js/elements.js';
import { createSpinnerIcon } from '/js/std-js/icons.js';
import { save } from '/js/std-js/filesystem.js';

document.forms.converter.addEventListener('submit', async event => {
	event.preventDefault();
	const target = event.target;
	const data = new FormData(target);
	const controls = target.querySelectorAll('input, button, select');
	const dialog = createElement('dialog', {
		events: { close: ({ target }) => target.remove() },
		styles: { background: 'transparent' },
		animation: {
			keyframes: [
				{ transform: 'none' },
				{ transform: 'rotate(1turn)' },
			],
			duration: 1200,
			easing: 'linear',
			fill: 'both',
		},
		children: [
			createSpinnerIcon({ size: parseInt(Math.min(innerWidth, innerHeight) * 0.8) }),
		]
	});

	controls.forEach(el => el.disabled = true);
	document.body.append(dialog);
	dialog.showModal();

	try {
		const file = await resizeImageFile(data.get('image'), {
			height: parseInt(data.get('height')),
			quality: parseFloat(data.get('quality')),
			type: data.get('type'),
		});

		await save(file);
	} catch(err) {
		console.error(err);
		document.getElementById('error').textContent = err;
		setTimeout(() => document.getElementById('error').textContent = '', 5000);
	} finally {
		controls.forEach(el => el.disabled = false);
		dialog.close();
	}
});

document.forms.converter.addEventListener('reset', () => {
	const container = document.getElementById('preview-container');
	const img = container.querySelector('img[src^="blob:"]');
	const output = document.querySelector('output[for="quality"]');
	output.textContent = '80%';

	if (output instanceof HTMLImageElement) {
		URL.revokeObjectURL(img.src);
	}

	container.replaceChildren(createImage('/img/raster/missing-image.png', {
		crossOrigin: 'anonymous',
		referrerPolicy: 'no-referrer',
		loading: 'lazy',
		height: 480,
		width: 640,
	}));
});

document.getElementById('quality').addEventListener('input', ({ target }) => {
	const output = document.querySelector(`output[for="${target.id}"]`);
	output.textContent = `${parseInt(target.valueAsNumber * 100)}%`;
});

previewImgOnChange('#image', '#preview-container');
