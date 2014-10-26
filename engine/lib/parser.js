var peg = require('pegjs');
var ser = require('./serializer');
var fs = require('fs');

module.exports  = function(req, parserCodePath){
		var result;
		try{
		var parserCode = fs.readFileSync(parserCodePath, "utf-8");
		var parser = peg.buildParser(parserCode);
		result = ser.deserialize(parser.parse(req));
		} catch(err) {
		console.log("ERROR!");
		}
		return result;
	};
