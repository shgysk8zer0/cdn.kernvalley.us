'use strict';

if (confirm('Delete all Web App data?')) {
	Promise.all([
		Promise.resolve().then(function() {
			if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
				return navigator.serviceWorker.ready.then(function(sw) {
					return sw.unregister();
				});
			}
		}),
		Promise.resolve().then(function() {
			if ('caches' in window && caches.keys instanceof Function) {
				return caches.keys().then(function(keys) {
					return Promise.all(keys.map(function(key) {
						return caches.delete(key);
					}));
				});
			}
		}),
		Promise.resolve(localStorage.clear()),
		Promise.resolve(sessionStorage.clear()),
		Promise.resolve().then(function() {
			if ('cookieStore' in window && cookieStore.getAll instanceof Function) {
				return cookieStore.getAll().then(function(cookies) {
					return Promise.all(cookies.map(function(cookie) {
						return cookieStore.delete(cookie);
					}));
				});
			}
		})
	]).then(function() {
		alert('Web App data cleared');
		location.href = '/';
	}).catch(function(err) {
		console.error(err);
		if (typeof err === 'string') {
			alert('Error clearing data: ' + err);
		} else if ('message' in err) {
			alert('Error clearing data: ' + err.message);
		} else {
			alert('Error clearing data');
		}
		location.href = '/';
	});
} else {
	location.href = '/';
}
