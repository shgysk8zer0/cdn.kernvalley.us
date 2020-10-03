if (confirm('Delete all Web App data?')) {
	Promise.all([
		navigator.serviceWorker.ready.then(function(sw) {
			return sw.unregister();
		}),
		caches.keys().then(function(keys) {
			return Promise.all(keys.map(function(key) {
				return caches.delete(key);
			}));
		}),
		Promise.resolve(localStorage.clear()),
		Promise.resolve(sessionStorage.clear())
	]).then(function() {
		alert('Web App data cleared');
		location.href = '/';
	}).catch(function(err) {
		console.error(err);
		alert('Error clearing data');
		location.href = '/';
	});
} else {
	location.href = '/';
}
