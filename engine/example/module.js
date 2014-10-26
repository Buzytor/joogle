var run = module.exports.run = function(fun, sth) {
		return fun(sth);
};
module.exports.map = function(fun, arr) {
	var ar = [];
	for(var i = 0; i < arr.length; i++) {
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
	var result = [];
	for(var i = 0; i < a.length; i ++) {
		result = a[i] + b[i];
	}
	return result;
};

module.exports.addArrayStrange = function(a, b) {
	for(var i = 0; i < a.length; i ++) {
		a[i] = a[i] + b[i];
	}
	return a;
};
var fill = module.exports.fill = function(a, b) { 
	var result = [];
	for(var i = 0; i < a; i++) { 
		result[i] = b;	
	}	
	return result;
};

module.exports.lengths = function(a) {
	var result = [];
	for(var i = 0; i < a.length; i ++) {
		result[i] = a[i].length;
	}
	return result;
};

module.exports.someStuff = function(a, b ,c) {
	return [fill(a, b), fill(b, a), c, [6 , 3]];
};

module.exports.moreStuff = function(a, b) {
	var ret = fill(a, b);
	var x = ret.length;
	var tab = [];
	for(var i = 0; i < ret.length; i ++) {
		tab.push(ret[i]);
	}
	var y  = tab.length;
	return  ret.length + x + tab[0] + y;
};

module.exports.mutliply = function(a, b) {
	return a * b;
};

module.exports.first =  function(a) {
	return a[0];
};
module.exports.last = function(a) {
	return a[a.length-1];
};
