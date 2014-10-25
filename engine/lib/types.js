// A module with data structures for type expressions.

var Any = exports.Any = {};

// Built-in JS type. Example: String, Number
var Simple = exports.Simple = function(name) {
	this.name = name;
};

// An object having given properties.
// @param properties {Object} - mapping property names -> types.
//    Default value: {} (matches any object)
var Obj = exports.Obj = function(properties) {
	this.properties = properties || {};
};

// A function.
// @param selfType {Object} - the type of 'this'.
//     There are functions that don't need this, so it can be Any.
// @param params {Array} - types of parameters.
// @param returnType {Object} - 
var Fn = exports.Fn = function(selfType, params, returnType) {
	this.selfType = selfType;
	this.params = params;
	this.returnType = returnType;
};

// A synonym for (realType | null).
var Nullable = exports.Nullable = function(realType) {
	this.realType = realType;
};
