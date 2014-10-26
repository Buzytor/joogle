var run = module.exports.run = function(fun, sth) {
		return fun(sth);
};
module.exports.map = function(fun, arr) {
	var ar = [];
	for(i = 0; i < arr.length; i++) {
		ar[i]= run(fun, arr[i]);
	}
	return ar;
};
module.exports.add = function(a, b){ 
		return a + b;
};

module.exports.addLength = function(a, b) {
	return a.length + b.length;	
};

module.exports.addArray = function(a, b) {
	for(i = 0; i < a.length; i ++) {
		a[i] += b[i];
	}
	return a;
};
