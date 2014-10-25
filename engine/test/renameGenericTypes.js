var types = require('../lib/types');
var infer = require('../lib/infer');

function test(data, desiredResult) {
	var scope = new MOCKSCOPE();

	var result = infer.renameGenericTypes(data, scope);

	var resultString = types.typeToString(result);

	if(resultString != desiredResult) {
		console.log('\nResults don\'t match!');
		console.log('Got:');
		console.log(resultString);
		console.log(result);
		console.log('Expected:');
		console.log(desiredResult);
	} else {
		console.log("Passed: " + resultString);
	}
}

var Any = types.Any, G = types.Generic, Fn = types.Fn, O = types.Obj;
var MOCKSCOPE = function() {}
MOCKSCOPE.prototype = {
	nextGenericTypeId: 1,
	newType: function() {
		return types.Generic('T' + (this.nextGenericTypeId++));
	}
};

test(
	G('A'),
	'T1'
);

test(
	Fn(Any, [G('A'), G('B')], Fn(Any, [G('B')], G('A'))),
	'(T1, T2) -> (T2) -> T1'
);

test(
	O({"a": G('A'), "b": G('B'), "c": G('A')}),
	'{a: T1, b: T2, c: T1}'
);
