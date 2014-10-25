// A module with data structures for type expressions.

var Any = exports.Any = {};

// Built-in JS type. Example: String, Number
var Simple = exports.Simple = function(name) {
	this.name = name;
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
//    Default value: {} (matches any object)
var Obj = exports.Obj = function(properties) {
	if(!(this instanceof Obj)) return new Obj(properties);
	this.properties = properties || {};
};

// A function.
// @param selfType {Object} - the type of 'this'.
//     There are functions that don't need this, so it can be Any.
// @param params {Array} - types of parameters.
// @param returnType {Object} - 
var Fn = exports.Fn = function(selfType, params, returnType) {
	if(!(this instanceof Fn)) return new Fn(selfType, params, returnType);
	this.selfType = selfType;
	this.params = params;
	this.returnType = returnType;
};

// A synonym for (realType | null).
var Nullable = exports.Nullable = function(realType) {
	if(!(this instanceof Nullable)) return new Nullable(realType);
	this.realType = realType;
};

// An union type (A | B | C | ...).
var Union = exports.Union = function(types) {
	if(!(this instanceof Union)) return new Union(types);
	this.types = types;
};

// Returns a type which is a union of all of given types.
// Given Union types are merged together, producing a flat structure.
var union = exports.union = function(types) {
	// TODO flatten the structure
	return Union(types);
};

// A generic type, identified by name.
var Generic = exports.Generic = function(name) {
	if(!(this instanceof Generic)) return new Generic(name);
	this.name = name;
};
