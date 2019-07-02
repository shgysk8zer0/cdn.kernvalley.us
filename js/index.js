import '/components/web-app.js';
import PaymentRequestFallback from './PaymentAPI/PaymentRequest.js';
import PaymentResponseFallback from './PaymentAPI/PaymentResponse.js';

if (! ('PaymentRequest' in window)) {
	window.PaymentRequest = PaymentRequestFallback;
}
if (! ('PaymentResponse' in window)) {
	window.PaymentResponse = PaymentResponseFallback;
}

document.documentElement.ready.then(async () => {
	const buy = document.getElementById('buy-now');
	const displayItems = [{
		label: 'Item 1',
		amount: {
			currency: 'USD',
			value: 10.52
		}
	}, {
		label: 'Item 2',
		amount: {
			currency: 'USD',
			value: 1.03
		}
	}, {
		label: 'Item 3',
		pending: true,
		amount: {
			currency: 'USD',
			value: 147.32
		}
	}];

	const shippingOptions = [{
		id: 'standard',
		label: 'Standard shipping',
		amount: {
			currency: 'USD',
			value: '0.00'
		},
		selected: true
	}, {
		id: 'overnight',
		label: 'Overnight Shipping',
		amount: {
			currency: 'USD',
			value: 7.99
		},
	}];

	displayItems.push(shippingOptions.find(opt => opt.selected === true));

	const req = new PaymentRequest([{
		supportedMethods: 'basic-card',
		data: {
			supportedNetworks: ['visa', 'mastercard','discover'],
			supportedTypes: ['credit', 'debit']
		}
	}], {
		total: {
			label: 'Total Cost',
			amount: {
				currency: 'USD',
				value: displayItems.reduce((total, item) => total + parseFloat(item.amount.value), 0),
			}
		},
		displayItems,
		shippingOptions,
	}, {
		requestPayerName: true,
		requestPayerEmail: true,
		requestPayerPhone: true,
		requestShipping: Array.isArray(shippingOptions) && shippingOptions.length !== 0,
		shippingType: 'delivery',
	});

	req.addEventListener('paymentmethodchange', event => {
		console.info(event);
	});

	req.addEventListener('shippingoptionchange', event => {
		event.updateWith(Promise.resolve({}));
		console.info(event);
	});

	req.addEventListener('shippingaddresschange', event => {
		event.updateWith(Promise.resolve({}));
		console.info(event);
	});

	window.request = req;

	if (await req.canMakePayment()) {
		buy.disabled = false;
		buy.addEventListener('click', async () => {
			try {
				const resp = await req.show();
				window.response = resp;
				console.log(resp);
				resp.complete('success');
			} catch(err) {
				console.error(err);
			}
		});
	}
});
