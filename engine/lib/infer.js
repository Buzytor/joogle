// Magic inference engine.

var types = require('./types');
var ConstraintSolver = require('./constraintSolver').solver;

var Fn = types.Fn, Obj = types.Obj, Any = types.Any;
var debug = require('./debug');

var walkRecursive = exports.walkRecursive =
		function(visitor, node, state) {
			function recurse(node) {
				var ret = visitor[node.type](node, state, recurse);
				return ret;
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
		if(!node.elements) {
			return [ ET(types.Arr(scope.newType())) ];
		} else {
			var argsETs = node.elements.map(recurse);
			return map(possibleArgumentETs(argsETs), function(argsET) {
				var elementType = scope.newType();
				var et = ET({
					type: types.Arr(elementType),
					constraints: [].concat(
						flatMap(argsET, etConstraints),
						argsET.reduce(function(acc, argET) {
							return acc.concat([Constraint(argET.type, elementType)]);
						}, [])
					)
				});
				return et;
			});
		}
	},
	ObjectExpression: function(node, scope, recurse) {
		var propNames = [];
		var propTypes = []
		node.properties.forEach(function(property) {
			if(property.kind !== 'init') {
				console.warn('Getters and setters not implemented');
				return;
			}
			propNames.push(keyName(property.key));
			propTypes.push(recurse(property.value));
		});
		// keyName :: (Identifier | Literal) -> String
		function keyName(key) {
			return key.name || key.value;
		}
		return map(possibleArgumentETs(propTypes), function(propsET) {
			// propsET : [ET] (one ET for each prop)
			
			var props = {};
			propsET.forEach(function(propET, index) {
				props[propNames[index]] = propET.type;
			});
			return {
				type: types.Obj(props),
				constraints: flatMap(propsET, etConstraints)
			};
		});
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
		var objectETs = recurse(node.object);
		var resultType = scope.newType();
		if(node.computed) {
			var propETs = recurse(node.property);
			return flatMap(objectETs, function(objectET) {
				return flatMap(propETs, function(propET) {
					return ET({
						type: resultType,
						constraints: [].concat(
							objectET.constraints,
							propET.constraints,
							Constraint(objectET.type, types.Arr(resultType)),
							Constraint(propET.type, types.Number)
						)
					});
				});
			});
		} else {
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
	AssignmentExpression: function(node, scope, recurse) {
		var lhsETs = recurse(node.left);
		var rhsETs = recurse(node.right);
		return flatMap(lhsETs, function(lhsET) {
			return flatMap(rhsETs, function(rhsET) {
				return ET({
					type: rhsET.type,
					constraints: [].concat(
						lhsET.constraints,
						rhsET.constraints,
						Constraint(lhsET.type, rhsET.type)
					)
				});
			});
		});
	},
};

var inferStatement = function(node, scope) {
	return walkRecursive(statementInferrer, node, scope);
};

var statementInferrer = {
	ExpressionStatement: function(node, scope, recurse) {
		return inferExpression(node.expression, scope).map(etConstraints);
	},
	Program: function(node, scope, recurse) {
		// Not really a Statement, but works like a block.
		return andConstraints(node.body.map(recurse));
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
	VariableDeclaration: function(node, scope, recurse) {
		return andConstraints(node.declarations.map(recurse));
	},
	VariableDeclarator: function(node, scope, recurse) {
		var valETs;
		if(node.init) {
			valETs = inferExpression(node.init, scope);
		} else {
			valETs = [ ET(scope.newType()) ];
		}
		scope.set(node.id.name, valETs);
		return valETs.map(etConstraints);
	},
	ForStatement: function(node, scope, recurse) {
		var initCSs = node.init?
			node.init.type === 'VariableDeclaration'?
				recurse(node.init):
				inferExpression(node.init, scope).map(etConstraints):
			[[]];
		var testCSs = node.test? inferExpression(node.test, scope).map(etConstraints): [[]];
		var updateCSs = node.update? inferExpression(node.update, scope).map(etConstraints): [[]];
		var bodyCSs = recurse(node.body);

		return andConstraints([ initCSs, testCSs, updateCSs, bodyCSs ]);
	},
};

var inferModule = exports.inferModule = function(node) {
	var scope = new Scope();
	var exportsType = scope.newType();
	scope.set('module', [ ET(types.Obj({ exports: exportsType })) ]);
	var cSets = inferStatement(node, scope);
	return cSets.map(function(cSet) {
		var solver = new ConstraintSolver();
		cSet.forEach(function(constraint) {
			solver.addConstraint(constraint);
		});
		return solver.evaluateType(exportsType);
	});	
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
var numberBinPredET = ET(Fn(Any, [types.Number, types.Number], types.Boolean));

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
	'<': [ numberBinPredET ],
	'<=': [ numberBinPredET ],
	'>': [ numberBinPredET ],
	'=>': [ numberBinPredET ],
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
				if(!cache[type.name]) {
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
			case 'Arr':
				return new types.Arr(_rgt(type.elementType));
			case 'Any':	case 'Simple': default:
				return type;
		}
	};
	return _rgt(type);
};

var normalizerScope = exports.normalizerScope = function() {
	this.counter = 65;
	this.newType = function() {
		return types.Generic(String.fromCharCode(this.counter++));
	};
};

var normalizeType = exports.normalizeType = function(type) {
	var scope = new normalizerScope();
	return renameGenericTypes(type, scope);
};

var createGenericSignature = exports.createGenericSignature = function(type) {
	var scope = new normalizerScope();
	var cache = {};
	var _rgt = function(type) {
		switch(type['!kind']) {
			case 'Generic': case 'Simple':
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
			case 'Arr':
				return new types.Arr(_rgt(type.elementType));
			case 'Any':
				return type;
		}
	};
	return _rgt(type);
};
