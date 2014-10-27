var types = require('./types');

var serialize = exports.serialize = function(type) {
	var tmp = {}
	for(var k in type) {
		if(type.hasOwnProperty(k)) {
			tmp[k] = type[k];
		}
	}
	tmp["!kind"] = type.__proto__["!kind"];
	return tmp;
};

var deserialize = exports.deserialize = function(json) {
	if(json['!kind'] === "Any") {
		return json;
	}
	var proto = types.kindToPrototype[json['!kind']];
	delete json['!kind'];
	var tmp = Object.create(proto);
	for(var k in json) {
		tmp[k] = json[k];
	}
	return tmp;
};
