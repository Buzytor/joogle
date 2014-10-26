start
  = space wrapper:type space {return wrapper; }

functionType
  = "(" space params:typeList space ")" space "->" space ret:type {return {'!kind': 'Function', selfType: { '!kind': 'Any'}, params: params, returnType: ret};}

typeList
 = first:type space "," space rest:typeList   {return [first].concat(rest); }
 / first:type { return [first]; }
 / "" {return []; }
 
type
 = objectType
 / functionType
 / simpleType
space 
 = " " *

simpleType
  = name:simpleName {
	  var type = 'Generic';
	  switch(name){
		  case 'Number': 
			type = 'Simple';
			break;
		  case 'Boolean': 
			type = 'Simple';
			break;
		  case 'Array': 
			type = 'Simple';
			break;
		  case 'RegExp': 
			type = 'Simple';
			break;
		  case 'String': 
			type = 'Simple';
			break;
		  }
	  return {'!kind': type, name: name};
	  }

simpleName
  = firstChar: [a-zA-z] rest: [a-zA-Z0-9]* {return firstChar + rest.join("");}



objectType
  = "{" space prop:property *  space "}" { 
	  var properties = {};
	  prop.forEach(function(property){
		    properties[property[0]] = property[1];
	  })    
	  return {'!kind': 'Obj', properties: properties }; }

property
  = name:propertyName space val:type space "," * space {return [name, val];}

propertyName
  = name:simpleName ":" {return name;}
