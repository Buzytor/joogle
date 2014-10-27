var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var infer = require('../engine/lib/infer');
var constraintSolver = require('../engine/lib/constraintSolver');
var types = require('../engine/lib/types');

var MongoClient = require('mongodb').MongoClient;

var parser = require('../engine/lib/parser.js');
parser.loadParser('../engine/lib/parser.pegjs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.disable('etag');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var dbConnect = MongoClient.connect.bind(MongoClient, 'mongodb://127.0.0.1:27017/joogle');


var makeNonGenericSignature = function(sig) {
    return infer.renameGenericTypes(sig, new infer.normalizerScope());
};

var makeGenericSignature = function(sig) {
    return infer.createGenericSignature(sig);
};

var createRegexFromInput = function(input) {
    var regex = input.replace(/\*/, ".*");
    var escaped = regex.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    return "^"+escaped+"$";
};

var selectValidResults = function(inputSignature, results) {
    var inputConstraint = infer.Constraint(new types.Generic('XXX'), inputSignature);
    return results.filter(function(func) {
	var sigs = func.signatures.filter(function(sig) {
	    var solver = new constraintSolver.solver();
	    var secondConstraint = infer.Constraint(new types.Generic('XXX'), sig);
	    solver.addConstraint(inputConstraint);
	    solver.addConstraint(secondConstraint);
	    var result = solver.evaluateType(new types.Generic('XXX'));
	    console.log(result);
	    return result != "OMG ERROR";
	});
	console.log(sigs.length);
	return sigs.length != 0;
    });
};

var getDetails = function(fnName) {
    return new Promise(function(resolve, reject) {
	try {
	    dbConnect(function(err, db){
		if(err) { throw err; }
		var signatures = db.collection('signatures');
		signatures.find({"name": fnName}).toArray(function(err, results) {
		    if(err) { throw err; }
		    db.close();
		    resolve(results);
		});
	    });
	} catch(e) {
	    reject(e);
	}
    });
};

var getResults = function(rawInput) {
    var parsedInput = parser.parseString(rawInput);
    var nonGenericSignature = types.typeToString(makeNonGenericSignature(parsedInput));
    var genericSignature = types.typeToString(makeGenericSignature(parsedInput));
    var nonGenericSignatureRegex = createRegexFromInput(nonGenericSignature);
    var genericSignatureRegex = createRegexFromInput(genericSignature);
    return new Promise(function(resolve, reject) {
        try {
            dbConnect(function(err, db){
                if(err) { throw err; }
                var signatures = db.collection('signatures');
                var qw = {"$or": [
                    {"genericSignature": {"$regex": genericSignatureRegex}},
                    {"genericSignature": {"$regex": nonGenericSignatureRegex}}
                ]};
                signatures.find(qw).toArray(function(err, results) {
                    if(err) { throw err; }
                    db.close();
                    var r = [];
                    if(results) {
                        r = selectValidResults(parsedInput, results);
                    }
                    resolve(r);
                });
            });
        } catch(e) {
            console.log(e);
            switch(e.name) {
                case 'SyntaxError':
                    resolve('');
                    break;
                case 'EmptyQueryError':
                    resolve('');
                    break;
                case 'ParseError':
                    resolve('')
                        break;
                default:
                    reject(e);
           }
        }
    });
};

app.get('/', function(req, res) {
    res.render('index', {});
});

app.get('/search', function(req, res) {
    var query = req.query.q;
    getResults(query).then(function(obj) {
        var results = obj;
        res.render('search', {"results": results, "title": query+" :: Search results :: "});
    }).catch(function(err) {
	res.status(500).send("Query handling error: "+err);
    });
});

app.get('/details/:name', function(req, res) {
    var name = req.params.name;
    getDetails(name).then(function(obj) {
        res.render('details', {"results": obj, "title": name+" :: "});
    }).catch(function(err) {
	res.status(500).send("Query handling error: "+err);
    });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
})


module.exports = app;

var debug = require('debug')('front-end');
app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
});
