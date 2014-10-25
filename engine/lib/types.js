// A module with data structures for type expressions.
//
// Each "type type" (let's call it kind) is identified
// by '!kind' property. The 'equal' function uses this.

var Any = exports.Any = {
	'!kind': 'Any',
};

// Built-in JS type. Example: String, Number
var Simple = exports.Simple = function(name) {
	this.name = name;
};
Simple.prototype = {
	'!kind': 'Simple',
};

// Built-in JS types:
exports.String = new Simple('String');
exports.Number = new Simple('Number');
exports.Boolean = new Simple('Boolean');
exports.Array = new Simple('Array');
exports.RegExp = new Simple('RegExp');

// The type of literal 'null'.
exports.Null = new Simple('Null');
// The type of undefined value.
exports.Undefined = new Simple('Undefined');

// An object having given properties.
// @param properties {Object} - mapping property names -> types.
//	Default value: {} (matches any object)
var Obj = exports.Obj = function(properties) {
	if(!(this instanceof Obj)) return new Obj(properties);
	this.properties = properties || {};
};
Obj.prototype = {
	'!kind': 'Obj',
};

// A function.
// @param selfType {Object} - the type of 'this'.
//	 There are functions that don't need this, so it can be Any.
// @param params {Array} - types of parameters.
// @param returnType {Object} - 
var Fn = exports.Fn = function(selfType, params, returnType) {
	if(!(this instanceof Fn)) return new Fn(selfType, params, returnType);
	this.selfType = selfType;
	this.params = params;
	this.returnType = returnType;
};
Fn.prototype = {
	'!kind': 'Generic',
};

// A generic type, identified by name.
var Generic = exports.Generic = function(name) {
	if(!(this instanceof Generic)) return new Generic(name);
	this.name = name;
};
Generic.prototype = {
	'!kind': 'Generic',
};


// Check whether typeA is equal to typeB.
var equal = exports.equal = function(typeA, typeB) {
	if(typeA['!kind'] != typeB['!kind'])
		return false;
	if(!typeA['!kind']) {
		// both are primitive values
		return true;
	}
	if(typeA.equals) {
		return typeA.equals(typeB);
	} else {

		var keysTypeA = Object.keys(typeA);
		
		keysTypeA.forEach(function(key){
			if(!(typeA[key] == typeB[key])) {
					return false;
				}
			});
		return true;
	}
};
