var types = require('../lib/types');
var infer = require('../lib/infer');
var acorn = require('acorn');
var deepEqual = require('deep-equal');

var ET = infer.ET, C = infer.Constraint, G = types.Generic;

function parseExpr(str) {
	return acorn.parseExpressionAt(str, 0);
}

function test(exprStr, desiredResult) {
	var scope = rootScope.clone();
	var expr = parseExpr(exprStr);

	var result = infer.inferExpression(expr, scope);


	if(!deepEqual(result, desiredResult)) {
		console.log('Results dont match!');
		console.log('Root scope:');
		printScope(rootScope);
		console.log('------------------');
		console.log('Input: ' + exprStr);
		console.log('Desired result:');
		printETs(desiredResult);
		console.log('Actual result:');
		printETs(result);
	}
}

var rootScope = new infer.Scope({
	'toString': [
		ET(types.Fn(types.Any, [types.Generic('A')], types.Generic('String'))),
	],
	'x': [ ET(types.Generic('X')) ],
	'y': [ ET(types.Generic('Y')) ],
	's': [ ET(types.Obj({ length: types.Number })) ],
});

function printScope(scope) {
	Object.keys(scope.vars).forEach(function(key) {
		scope.vars[key].forEach(function(et) {
			console.log(key + ' :: ' + types.typeToString(et.type));
		});
	});
}

function printETs(ets) {
	ets.forEach(function(et) {
		console.log('Expression type: ' + types.typeToString(et.type));
		et.constraints.forEach(function(c) {
			console.log('  ' + c.toString());
		});
	});
}

test(
	'x',
	[
		{ type: G('X'), constraints: [] },
	]
);

test(
	'toString(x)',
	[
		ET(G('T1'), [
			C(types.Fn(types.Any, [G('A')], types.String),
			  types.Fn(types.Any, [G('X')], G('T1')))
		]),
	]
);

test(
	's.length',
	[
		ET(G('T1'), [
			C(types.Obj({length: types.Number}),
			  types.Obj({length: G('T1')}))
		]),
	]
);

test(
	'x * y',
	[
		ET(G('T1'), [
			C(types.Fn(types.Any, [types.Number, types.Number], types.Number),
			  types.Fn(types.Any, [G('X'), G('Y')], G('T1')))
		]),
	]
);

test(
	'function(a) { return a; }',
	[
		ET(types.Fn(types.Any, [G('T1')], G('T1'))),
	]
);
