import { loadScript } from '../../js/std-js/loader.js';

export const VERSION = '/v3/';

export const loadStripe = (async () => {
	await loadScript(new URL(VERSION, 'https://js.stripe.com/'));

	if ('Stripe' in globalThis) {
		return globalThis.Stripe;
	} else {
		throw new Error('Error loading Stripe');
	}
}).once();

export const getStripeInstance = (async key => {
	const Stripe = await loadStripe();
	return Stripe(key);
}).once();

export function getCurrencySymbol() {
	return '$';
}
