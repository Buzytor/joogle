// Magic inference engine.

var types = require('./types');
var ConstraintSolver = require('./constraintSolver').solver;

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
	FunctionExpression: function(node, parentScope, recurse) {
		var paramNames = node.params.map(function(param) { return param.name; });
		if(node.expression || node.generator) {
			throw new Error('Weird ES6-only shit not supported');
		}
		var scope = parentScope.clone();
		var paramTypes = {};
		paramNames.forEach(function(name) {
			var type = scope.newType();
			scope.set(name, [ ET(type) ]);
			paramTypes[name] = type;
		});
		var returnType = scope.newType();
		scope.set('return', [ ET(returnType) ]);
		var constraintSets = inferStatement(node.body, scope);
		return constraintSets.map(function(cSet) {
			var solver = new ConstraintSolver();
			cSet.forEach(function(constraint) {
				solver.addConstraint(constraint);
			});
			var fnType = Fn(Any, paramNames.map(function(name) {
				return evalType(paramTypes[name]);
			}), evalType(returnType));
			
			function evalType(t) {
				return solver.evaluateType(t);
			}

			return ET(renameGenericTypes(fnType, parentScope));
		});
	},
	CallExpression: function(node, scope, recurse) {
		var calleeETs = recurse(node.callee);
		var argsETs = node.arguments.map(recurse);
		return inferCall(calleeETs, argsETs, scope);
	},
	BinaryExpression: function(node, scope, recurse) {
		var calleeETs = getBinaryOpETs(node.operator, scope);
		if(!calleeETs)
			throw new Error('Unknown operator: ' + node.operator);
		var argsETs = [ recurse(node.left), recurse(node.right) ];
		return inferCall(calleeETs, argsETs, scope);
	},
	UnaryExpression: function(node, scope, recurse) {
		var calleeETs = unaryOperatorETs[node.operator];
		if(!calleeETs)
			throw new Error('Unknown operator: ' + node.operator);
		var argsETs = [ recurse(node.argument) ];
		return inferCall(calleeETs, argsETs, scope);
	},
	UpdateExpression: function(node, scope, recurse) {
		var calleeETs = unaryOperatorETs[node.operator];
		if(!calleeETs)
			throw new Error('Unknown operator: ' + node.operator);
		var argsETs = [ recurse(node.argument) ];
		return inferCall(calleeETs, argsETs, scope);
	},
	MemberExpression: function(node, scope, recurse) {
		if(node.computed) {
			console.warn('Computed member expr not implemented');	
			return Any;
		} else {
			var objectETs = recurse(node.object);
			var resultType = scope.newType();
			var desiredObjType = objWithOneProperty(node.property.name, resultType);
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

var inferStatement = function(node, scope) {
	return walkRecursive(statementInferrer, node, scope);
};

var statementInferrer = {
	ExpressionStatement: function(node, scope, recurse) {
		return inferExpression(node.expression, scope).map(etConstraints);
	},
	BlockStatement: function(node, scope, recurse) {
		return andConstraints(node.body.map(recurse));
	},
	EmptyStatement: function(node, scope, recurse) {
		return [[]];
	},
	LabeledStatement: function(node, scope, recurse) {
		return recurse(node.body);
	},
	ReturnStatement: function(node, scope, recurse) {
		var argETs = inferExpression(node.argument, scope);
		return flatMap(scope.get('return'), function(retET) {
			return argETs.map(function(argET) {
				return [].concat(
					argET.constraints,
					retET.constraints,
					[Constraint(retET.type, argET.type)]
				);
			});
		});
	},
};

// [[[Constraints]]] -> [[Constraints]]
function andConstraints(cSetSets) {
	return cSetSets.reduce(function(accs, cSets) {
		// accs :: [[C]], cSets :: [[C]]
		return flatMap(accs, function(acc) {
			return map(cSets, function(cSet) {
				return acc.concat(cSet); // [C]
			}); // [C]
		}); // [[C]]
	}, [[]]);
}

exports.andConstraints = andConstraints;

function objWithOneProperty(name, valueT) {
	var properties = {};
	properties[name] = valueT;
	return Obj(properties);
}

var numberBinaryOpET = ET(Fn(Any, [types.Number, types.Number], types.Number));
var numberUnaryOpET = ET(Fn(Any, [types.Number], types.Number));

function getBinaryOpETs(operator, scope) {
	var ret = binaryOperatorETs[operator];
	if(operator == '+') {
		ret = ret.map(function(et) {
			return ET(renameGenericTypes(et.type, scope));
		});
	}
	return ret;
}

var binaryOperatorETs = {
	'+': [
		ET(Fn(Any, [types.Generic('T1'), types.Generic('T2')], types.String)),
		numberBinaryOpET,
	],
	'-': [ numberBinaryOpET ],
	'*': [ numberBinaryOpET ],
	'/': [ numberBinaryOpET ],
	// TODO moar
};

var unaryOperatorETs = {
	'-': [ numberUnaryOpET ],
	'+': [ numberUnaryOpET ],
	'++': [ numberUnaryOpET ],
	'--': [ numberUnaryOpET ],
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
function ET(type, constraints) {
	if(!(this instanceof ET)) return new ET(type, constraints);

	if(type.type && type.constraints) {
		constraints = type.constraints;
		type = type.type;
	}

	this.type = type;
	this.constraints = constraints || [];
}
exports.ET = ET;

ET.prototype = {
	toString: function() {
		var cStr = this.constraints.map(function(c) { return c.toString(); })
			.join(', ');
		return 'ET(' + types.typeToString(this.type) + ', [' + cStr + '])';
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

var Scope = exports.Scope = function(vars, nextGenericTypeId) {
	this.nextGenericTypeId = nextGenericTypeId || 1;
	this.vars = vars || {};
};

Scope.prototype = {
	get: function(key) {
		if(!this.vars[key])
			throw new Error('Undefined variable: ' + key);
		return this.vars[key];
	},

	set: function(key, type) {
		this.vars[key] = type;
	},

	newType: function() {
		return types.Generic('T' + (this.nextGenericTypeId++));
	},

	// Return a new Scope, inheriting from this Scope.
	clone: function() {
		return new Scope(Object.create(this.vars), this.nextGenericTypeId);
	}
};

var renameGenericTypes = exports.renameGenericTypes = function(type, scope) {
	var cache = {};
	var _rgt = function(type) {
		switch(type['!kind']) {
			case 'Generic':
				if(cache[type.name] == undefined) {
					cache[type.name] = scope.newType();
				}
				return cache[type.name];
			case 'Function':
				return new Fn(_rgt(type.selfType), type.params.map(_rgt), _rgt(type.returnType));
			case 'Obj':
				var tmp = {};
				for(var k in type.properties) {
					if(type.properties.hasOwnProperty(k)) {
						tmp[k] = _rgt(type.properties[k]);
					}
				}
				return types.Obj(tmp);
			case 'Any':	case 'Simple': default:
				return type;
		}
	};
	return _rgt(type);
};
