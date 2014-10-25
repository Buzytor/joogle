function fold(constraints) {
  console.log('Input constraints', constraints);

  var result = {};
  for(func in constraints) {
    var funcTypes = [];
    for(var i = 0; i < constraints[func][1].length; i++) {
      var typeSet = constraints[func][1][i];
      var funcType = {};
      for(var j = 0; j < typeSet.length; j++)
        funcType[constraints[func][0][j]] = typeSet[j];
      funcTypes.push(funcType);
    }
    console.log(JSON.stringify(funcTypes, null, 2));
  }
}

fold({ 'func1': [['A', 'B', 'R'], [['Int', 'Int', 'String'], ['X', 'Y', 'Z']]] });
