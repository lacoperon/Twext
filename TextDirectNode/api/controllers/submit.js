'use strict';

const keys = require('../../config/secrets');
const request = require('request');
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
const util = require('util');

/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
  parse: parse
};

/*
  Functions in a127 controllers used for operations should take two parameters:

  Param 1: a handle to the request object
  Param 2: a handle to the response object
 */
function parse(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  const cmdArr = req.swagger.params.textMsg.value.trim().split(';').filter(function(str){
    return str != '';
  }).map(function(str) { return str.trim() });

  let cmdJSON = interpret(cmdArr);
  // this sends back a JSON response which is a single string
  res.json(cmdJSON);
}

let home; // Replace global variable with database of users.

function interpret(cmdArr) {
  let cmdJSON = {w: [], d: []};
  cmdArr.forEach(function(cmd) {
    switch (cmd.substring(0,2).toUpperCase()) {
      case 'W-':
        cmdJSON.w.push(cmd.substring(2).trim());
        break;
      case 'D-':
        cmdJSON.d.push(cmd.substring(2).trim());
        break;
      case 'H-': // H- prefix sets home/default address
        home = cmd.substring(2).trim();
        break;
      default:
        console.log('unknown command');
    }
  });

  return cmdJSON.d.map(function(cmd) { getDirections(cmd) }).join('\n\n');
}

// Direction commands get turn-by-turn directions from Google Maps API;
// "b-" prefix optionally specifies beginning address (home address by default)
// "e-" prefix optionally specifies end address (by default, the command minus any beginning address strings)
function getDirections(cmd) {
  const matchedOrigin = cmd.match(/b-((?!e-).)*/im);

  if (matchedOrigin) {
    var origin = matchedOrigin[0].substring(2);
    var matchedDestination = cmd.match(/e-((?!b-).)*/im);
    var destination = matchedDestination ? matchedDestination[0].substring(2) : cmd.replace(origin, '');
  } else {
    var origin = home;
    var matchedDestination = cmd.match(/e-((?!b-).)*/im);
    var destination = matchedDestination ? matchedDestination[0].substring(2) : cmd;
  }

  request(
    'https://maps.googleapis.com/maps/api/directions/json?origin=' + origin +
    '&destination=' + destination + '&avoid=tolls&key=' + keys.google_maps_key,
    function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const route = JSON.parse(body).routes[0].legs[0];
        const destination = route.end_address;
        let directions = (route.distance.text + ' (' + route.duration.text +
          ') from ' + route.start_address + ' to ' + destination + '\n');
        directions = route.steps.map(function(step) {
          return ('In ' + step.distance.text + ': ' +
            step.html_instructions.replace(/<\/?b>/g, ''));
        }).join('\n');
        directions += '\nDestination: ' + destination;
        console.log(directions);
      }
    }
  );
}
