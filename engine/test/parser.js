var parser = require('../lib/parser');
var types = require('../lib/types');
var deepEqual = require('deep-equal');
var colors = require('colors');

parser.loadParser('../lib/parser.pegjs');

function test(data, desiredResult, comment) {
	
	console.log('\n' + data);
	
	if(!comment) comment = '';
	var desiredString = '';
	var result, resultString;	
	
	try{
		desiredString = types.typeToString(desiredResult);
	} catch(e) {
		console.log(e.message);
	}
	try{
		result = fun(data);
		resultString = types.typeToString(result);

	} catch(e) {
		console.log("Function exception in: " 
			+ desiredString + ' ' + comment);
		console.log('\t' + e.message);
		throw "fail";
	}


	if(!deepEqual(result, desiredResult)) {
		console.log('Results don\'t match!');
		console.log('Got:');
		console.log(resultString);
		console.log(result);
		console.log('\nExpected:');
		console.log(desiredString + ' ' + comment);
		console.log(desiredResult);
		throw "fail";
	} else {
		console.log('Passed: ' + resultString + ' ' + comment);
	}

}

var testSuite = function() {
	try{
		test(
			'T1',
			{'!kind': 'Generic', name: 'T1'}
		);

		test(
			'[T1]',
			{ '!kind': 'Arr', elementType: {'!kind': 'Generic', name: 'T1'} }
		);

		test(
			'String',
			{'!kind': 'Simple', name: 'String'}
		);

		test(
			'Number',
			{'!kind': 'Simple', name: 'Number'}
		);

		test(
			'Boolean',
			{'!kind': 'Simple', name: 'Boolean'}
		);
		
		test(
			'RegExp',
			{'!kind': 'Simple', name: 'RegExp'}
		);
		
		test(
			'(Number, A) -> Number',
			{ '!kind': 'Function', selfType: { '!kind': 'Any' },
			params: [ { '!kind': 'Simple', name: 'Number' }, 
			{ '!kind': 'Generic', name: 'A' } ], 
			returnType: { '!kind': 'Simple', name: 'Number' } }
		);
		
		test(
			'([A],[B]) -> C',
			{ '!kind': 'Function', selfType: { '!kind': 'Any' }, 
			params: [ { '!kind': 'Arr', elementType:  {'!kind': 'Generic', name: 'A'} },
			{ '!kind': 'Arr', elementType:  {'!kind': 'Generic', name: 'B'} } ],
			returnType: {'!kind': 'Generic', name: 'C'} }
		);

		test(
			'{prop: T1}',
			{'!kind': 'Obj', properties: {prop: { '!kind': 'Generic', name: 'T1'}}}
		);
		
		test(
			'((A) -> B, [A]) -> [C]',
			{ '!kind': 'Function', selfType: { '!kind': 'Any' }, 
			params: [ { '!kind': 'Function', selfType: { '!kind': 'Any' },
			params: [ {'!kind': 'Generic', name: 'A'} ],
			returnType: {'!kind': 'Generic', name: 'B'} },
			{ '!kind': 'Arr', elementType:  {'!kind': 'Generic', name: 'A'} } ],
			returnType: { '!kind': 'Arr', elementType: {'!kind': 'Generic', name: 'C'} }  }
		);
		
		test(
			'*',
			{ '!kind': 'Any' } 	
		);
		
		test(
			'(*) -> A',
			{'!kind': 'Function', selfType: { '!kind': 'Any'},
			params: [ { '!kind': "Any" } ],
			returnType: {'!kind': 'Generic', name: 'A'}}
		);

		console.log('PASSED'.bgGreen); 
	} catch(e){
		console.log('FAILED'.bgRed);	
	}
};

var fun = parser.parseNoDeserialize;

testSuite();
