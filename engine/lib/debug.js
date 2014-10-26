var types = require('./types');

exports.printETs = function(ets) {
	ets.forEach(exports.printET);
	return ets;
};

exports.printET = function(et) {
	console.log('Expression type: ' + types.typeToString(et.type));
	et.constraints.forEach(function(c) {
		console.log('  ' + c.toString());
	});
	return et;
};

exports.printScope = function(scope) {
	Object.keys(scope.vars).forEach(function(key) {
		scope.vars[key].forEach(function(et) {
			console.log(key + ' :: ' + types.typeToString(et.type));
		});
	});
};

exports.printCSet = function(cSet) {
	console.log(cSet.join(', '));
};
