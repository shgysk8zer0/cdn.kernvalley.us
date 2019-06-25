export default class PaymentRequestUpdateEvent extends Event {
	updateWith(callback) {
		if (callback instanceof Function) {
			callback.call();
		}
	}
}
