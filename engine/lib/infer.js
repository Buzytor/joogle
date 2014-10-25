// Magic inference engine.

var types = require('./types');

var Fn = types.Fn, Obj = types.Obj, Any = types.Any;

var walkRecursive = exports.walkRecursive =
		function(visitor, node, state) {
			function recurse(node) {
				return visitor[node.type](node, state, recurse);
			}
			return recurse(node);
		};

var inferExpression = exports.inferExpression = function(node, scope) {
	return walkRecursive(exprInferrer, node, scope);
};

var exprInferrer = {
	ThisExpression: function(node, scope) {
		return scope.get('this');
	},
	ArrayExpression: function(node, scope, recurse) {
		throw new Error('Array not implemented');
	},
	ObjectExpression: function(node, scope, recurse) {
		var properties = {};
		node.properties.forEach(function(property) {
			if(property.kind !== 'init') {
				console.warn('Getters and setters not implemented');
				return;
			}
			properties[keyName(property.key)] = recurse(property.value);
		});
		// keyName :: (Identifier | Literal) -> String
		function keyName(key) {
			return key.name || key.value;
		}
		throw new Error('ObjectExpr not implemented');
	},
	FunctionExpression: function(node, scope, recurse) {
		console.warn('TODO: nested functions not implemented');
		return [ ET(Fn(Any, [], Any)) ];
	},
	CallExpression: function(node, scope, recurse) {
		var calleeETs = recurse(node.callee);
		var argsETs = node.arguments.map(recurse);
		return inferCall(calleeETs, argsETs, scope);
	},
	MemberExpression: function(node, scope, recurse) {
		if(node.computed) {
			console.warn('Computed member expr not implemented');	
			return Any;
		} else {
			var objectETs = recurse(node.object);
			var resultType = scope.newType();
			var desiredObjType = objWithOneProperty(node.name, resultType);
			return objectETs.map(function(objectET) {
				return ET({
					type: resultType,
					constraints: [].concat(
						objectET.constraints,
						[Constraint(objectET.type, desiredObjType)]
					)
				});
			});
		}
	},
	Identifier: function(node, scope) {
		return scope.get(node.name);
	},
	Literal: function(node, scope) {
		return [ ET(getLiteralType(node.value)) ];
	},
};

function objWithOneProperty(name, valueT) {
	var properties = {};
	properties[name] = valueT;
	return Obj(properties);
}

var operatorTypes = {
	'*': [
		Fn(Any, [types.Number, types.Number], types.Number)
	],
	// TODO moar
};

function getLiteralType(value) {
	if(typeof value === 'string') {
		return types.String;
	} else if(typeof value === 'boolean') {
		return types.Boolean;
	} else if(typeof value === 'number') {
		return types.Number;
	} else if(value === null) {
		return types.Null;
	} else if(value === undefined) {
		return types.Undefined;
	} else if(value instanceof Array) {
		return types.Array;
	} else if(value instanceof RegExp) {
		return types.RegExp;
	} else {
		throw new Error('weird literal: ' + value);
	}
}

function inferCall(calleeETs, argsETs, scope) {
	var returnType = scope.newType();
	// TODO think about 'this'
	return possibleCallETs(calleeETs, argsETs, returnType);
}

function possibleCallETs(calleeETs, argsETs, returnType) {
	return flatMap(possibleArgumentETs(argsETs), function(argsET) {
		// argsET : [ET] (one ET for each arg)
		return calleeETs.map(function(calleeET) {
			return {
				type: returnType,
				constraints: [].concat(
					// all constraints, joined
					flatMap(argsET, etConstraints),
					// function constraints
					calleeET.constraints,
					// plus the constraint for function type itself
					[Constraint(
						calleeET.type,
						Fn(Any,
							// type of each arguments
							argsET.map(etType),
							returnType
						)
					)]
				)
			};
		});
	});
}

function etType(et) {
	return et.type;
}
function etConstraints(et) {
	return et.constraints;
}


// [[ET]] -> [[ET]]
function possibleArgumentETs(argsETs) {
	return argsETs.reduce(function(accs, argETs) {
		return flatMap(accs, function(acc) {
			return map(argETs, function(argET) {
				return acc.concat([argET]);
			});
		});
	}, [[]]);
}

exports.possibleArgumentETs = possibleArgumentETs;
exports.possibleCallETs = possibleCallETs;

// a constraint requiring that a == b
var Constraint = exports.Constraint = function(a, b) {
	if(!(this instanceof Constraint)) return new Constraint(a, b);

	if(!(a && b))
		throw new Error('Got null types!');

	this.a = a;
	this.b = b;
};

Constraint.prototype = {
	toString: function() {
		return types.typeToString(this.a) + ' === ' + types.typeToString(this.b);
	}
};

// ET - "expression type", result of inference
// type :: Type
// constraints :: [Constraint]
var ET = exports.ET = function(type, constraints) {
	if(!(this instanceof ET)) return new ET(type, constraints);

	if(type.type && type.constraints) {
		constraints = type.contstraints;
		type = type.type;
	}

	this.type = type;
	this.constraints = constraints || [];
};

ET.prototype = {
	toString: function() {
		return 'ET(' + types.typeToString(this.type) + ', [...])';
	},
};

function map(a, f) {
	return a.map(f);
}

function flatMap(array, f) {
	return flatten(array.map(f));
}

function flatten(arrays) {
	return Array.prototype.concat.apply([], arrays);
}

var Scope = exports.Scope = function() {
	this.nextGenericTypeId = 1;
	this.vars = {};
};

Scope.prototype = {
	get: function(key) {
		return this.vars[key];
	},

	newType: function() {
		return types.Generic('T' + (this.nextGenericTypeId++));
	}
};
