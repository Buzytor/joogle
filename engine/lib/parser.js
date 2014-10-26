var peg = require('pegjs');
var ser = require('./serializer');
var fs = require('fs');

module.exports  = function(req, parserCodePath){
		var parserCode = fs.readFileSync(parserCodePath, "utf-8");
		var parser = peg.buildParser(parserCode);
		return ser.deserialize(parser.parse(req));
	};
