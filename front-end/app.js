var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Promise = require('bluebird');

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

var getResults = function(query) {
    return new Promise(function(resolve, reject) {
        resolve( {"results": [
                    {   "name": "map",
                        "signature": "(a -> b) -> [a] -> [b]",
                        "tags": ["alpha", "beta", "gamma", "delta"],
                        "description": "Map is a function that allows you to map something"
                    },
                    {
                        "name": "reduce",
                        "signature": "(a -> b -> a) -> a -> [b] -> a",
                        "tags": ["beta", "delta", "epsilon"],
                        "description": "Reduce folds your array"
                    }
        ]});
    });
}

app.get('/', function(req, res) {
    res.render('index', {title: "Joogle"});
});

app.get('/search', function(req, res) {
    var query = req.query.q;
    getResults(query).then(function(obj) {
        var results = obj.results;
        res.render('search', {"results": results});
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
});


module.exports = app;

var debug = require('debug')('front-end');
app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
});
