// A module with data structures for type expressions.
//
// Each "type type" (let's call it kind) is identified
// by '!kind' property. The 'equal' function uses this.

var deepEqual = require('deep-equal');

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
  mergedWith: function(obj) {
    var result = Obj();
    for(attr in this.properties)
      result.properties[attr] = this.properties[attr];
    for(attr in obj.properties) {
      if(result.properties[attr] === undefined)
        result.properties[attr] = obj.properties[attr];
      else if(!(equal(result.properties[attr], obj.properties[attr]))) {
        return 'failed';
      }
    }
    return result;
  }
};

// A homogenous array with elements of given type.
// @param elementType {Type}
var Arr = exports.Arr = function(elementType) {
	if(!(this instanceof Arr)) return new Arr(elementType);
	this.elementType = elementType;
};
Arr.prototype = {
	'!kind': 'Arr',
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
	'!kind': 'Function',
};

// A generic type, identified by name.
var Generic = exports.Generic = function(name) {
	if(!(this instanceof Generic)) return new Generic(name);
	this.name = name;
};
Generic.prototype = {
	'!kind': 'Generic',
};

var kindToPrototype = exports.kindToPrototype = {
	'Any': {},
	'Simple': Simple.prototype,
	'Generic': Generic.prototype,
	'Function': Fn.prototype,
	'Obj': Obj.prototype,
	'Arr': Arr.prototype,
};

// Check whether typeA is equal to typeB.
var equal = exports.equal = function(typeA, typeB) {
	return deepEqual(typeA, typeB);
};

var typeToString = exports.typeToString = function(type) {
	if(!type) return String(type);
	switch(type['!kind']) {
		case 'Any':
			return 'Any';
		case 'Generic': case 'Simple':
			return type.name;
		case 'Function':
			return "("+type.params.map(typeToString).join(", ")+") -> "+typeToString(type.returnType);
		case 'Obj':
			var props = type.properties;
			var keys = Object.getOwnPropertyNames(props);
			var strs = keys.map(function(k){ return k+": "+typeToString(props[k]); });
			return "{" + strs.join(", ") + "}";
		case 'Arr':
			return '[' + typeToString(type.elementType) + ']';
		default:
			return "ERROR: "+type;
	}
};
