var types = require('../lib/types');
var infer = require('../lib/infer');
var acorn = require('acorn');
var deepEqual = require('deep-equal');
var debug = require('../lib/debug');

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
		debug.printScope(rootScope);
		console.log('------------------');
		console.log('Input: ' + exprStr);
		console.log('Desired result:');
		debug.printETs(desiredResult);
		console.log('Actual result:');
		debug.printETs(result);
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

test(
	'function(fn, arg, z) { return fn(arg) + z; }',
	[
		ET(types.Fn(types.Any, [types.Fn(types.Any, [G('T1')], G('T2')), G('T1'), G('T3')], types.String)),
		ET(types.Fn(types.Any, [types.Fn(types.Any, [G('T4')], types.Number), G('T4'), types.Number], types.Number)),
	]
);

test(
	'[x]',
	[
		ET(types.Arr(types.Generic('X'))),
	]
);
