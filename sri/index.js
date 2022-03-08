import { fromFile } from '/js/std-js/integrity.js';
import { enable, disable, on, ready, value } from '/js/std-js/dom.js';
import { createPolicy } from '/js/std-js/trust.js';

const policy = createPolicy('default', {
	createScriptURL: input => {
		if ([location.origin, 'https://cdn.kernvalley.us'].includes(new URL(input, location.origin).origin)) {
			return input;
		} else {
			throw new DOMException(`Untrusted script url <${input}`);
		}
	}
});

navigator.serviceWorker.register(policy.createScriptURL('/sw.js')).catch(console.error);

ready().then(async () => {
	on('#copy-btn', {
		click: async () => {
			await navigator.clipboard.writeText(document.getElementById('hash').value);
		}
	});

	on('[data-close]', {
		click: function() {
			document.querySelectorAll(this.dataset.close).forEach(el => el.close());
		}
	});

	on(document.forms.request, {
		submit: async event => {
			event.preventDefault();
			const data = new FormData(event.target);
			disable('.btn-accept, fieldset');
			const controller = new AbortController();
			const { signal } = controller;

			signal.addEventListener('abort', () => {
				enable('.btn-accept, fieldset');
			}, { once: true });

			try {
				on('.btn-reject', { click: () => controller.abort() }, { signal, once: true });
				const integrity = await fromFile(data.get('file'), { algo: data.get('algo') });
				value('#hash', integrity);
				enable('#copy-btn');
				document.getElementById('error-msg').replaceChildren();
			} catch(err) {
				disable('#copy-btn');
				document.getElementById('error-msg').textContent = err;
				value('#hash', null);
				console.error(err);
				document.getElementById('error-dialog').showModal();
			} finally {
				if (! controller.signal.aborted) {
					setTimeout(() => controller.abort(), 500);
				}
			}
		},
		reset: () => {
			value('#hash', '');
			disable('#copy-btn');
			document.getElementById('error-container').replaceChildren();
		},
	});

	enable('fieldset, button[type="submit"], button[type="reset"]');
});
