start
  = space wrapper:type space {return wrapper; }

functionType
  = "(" space params:typeList space ")" space "->" space ret:type {return {params: params, ret: ret};}

typeList
 = first:type space "," space rest:typeList   {return [first].concat(rest); }
 / first:type { return [first]; }
 / "" {return []; }
 
type
 = functionType
 / simpleType

space 
 = " " *

simpleType
  = name: [a-zA-Z]+ {return name.join("")}
