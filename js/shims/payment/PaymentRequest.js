export default class PaymentRequest {
	constructor(methodData, details, {
		requestPayerName = false,
		requestPayerEmail = false,
		requestPayerPhone = false,
		shippingType = 'shipping',
	} = {}) {
		console.log({methodData, details, options: {requestPayerName, requestPayerEmail, requestPayerPhone, shippingType}});
	}
}
