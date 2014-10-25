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

	var resultStr = result.map(function(et) {
		return {
			type: types.typeToString(et.type),
			constraints: et.constraints.map(function(c) {
				return c.toString();
			})
		};
	});

	if(!deepEqual(result, desiredResult)) {
		console.log('Results dont match!');
		console.log('Root scope:');
		printScope(rootScope);
		console.log('------------------');
		console.log('Input: ' + exprStr);
		console.log(JSON.stringify(resultStr, null, 2));
	}
}

var rootScope = new infer.Scope({
	'toString': [
		ET(types.Fn(types.Any, [types.Generic('A')], types.Generic('String'))),
	],
	'x': [ ET(types.Generic('X')) ]
});

function printScope(scope) {
	Object.keys(scope.vars).forEach(function(key) {
		scope.vars[key].forEach(function(et) {
			console.log(key + ' :: ' + types.typeToString(et.type));
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
