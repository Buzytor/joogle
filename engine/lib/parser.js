var peg = require('pegjs');
var ser = require('./serializer');
var fs = require('fs');

var pegParser;

module.exports.loadParser = function(path) {
	pegParser = peg.buildParser(fs.readFileSync(path, "utf-8"));
};

module.exports.parseNoDeserialize = function(str) {
	return pegParser.parse(str);
};

module.exports.parseString = function(str) {
	if(!str) throw {name: 'EmptyQueryError'};
	var result = ser.deserialize(pegParser.parse(str));
	if(!result)	throw {name: 'ParseError'};
	return result;
};
