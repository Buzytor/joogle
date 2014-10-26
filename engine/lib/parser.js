var peg = require('pegjs');
var ser = require('./serializer');
var fs = require('fs');

exports = function(req){
		var parserCode = fs.readFileSync("parser.pegjs", "utf-8");
		var parser = peg.buildParser(parserCode);
		return ser.deserialize(parser.parse(req));
	};
