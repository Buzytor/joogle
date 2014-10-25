var npm = require('npm');
var fs = require('fs');
var path = require('path');
var execFile = require('child_process').execFile;

function infoLog(message) {
  console.log('\033[34m' + message + '\033[37m');
}

function packageFetch(packageName, packageDir, callback) {
  npm.load({ 'loglevel': 'silent' }, function(err, npm) {
    infoLog('Fetching and extrating `' + packageName + '`...');
    npm.commands.install(packageDir, [packageName], function(err, data) {
      infoLog('Fetched `' + packageName + '`, indexing source files...');
      var packagePath = path.join(packageDir, 'node_modules', packageName);
      // get all local .js files excluding dependencies
      execFile('find', [
        packagePath,
        '-not', '-path', path.join(packagePath, 'node_modules', '*'),
        '-name', '*.js'
      ], function(err, stdout, stderr) {
        var fileList = stdout.split('\n'); fileList.pop();
        callback(fileList);
      });
    });
  });
}

function packageParse(fileList) {
  console.log(fileList);
  // do 4w3s0m3 stuff in hier
}

packageFetch('watchify', '/tmp', packageParse);
