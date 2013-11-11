var endpoint = require('endpoint'),
  IndexToObjectStream = require('./IndexToObjectStream'),
  _ = require('lodash');

module.exports = QueryManager;

function isArray(obj) {
  return typeof obj == 'object' && typeof obj.length == 'number' &&
    Object.prototype.toString.call(obj) == '[object Array]';
}


function QueryManager(mainDb, indexManager) {
  this._mainDb = mainDb;
  this._indexManager = indexManager;
}


QueryManager.prototype.find = function(options, callback) {
  return this.stream(options).pipe(endpoint({objectMode: true}, callback));
};


QueryManager.prototype.stream = function(options) {
  var idxManager = this._indexManager;

  var transformStreamOptions = _.pick(_.extend({values: true, keys: false}, options), ['values', 'keys']);
  var indexToValue = new IndexToObjectStream(this._mainDb, idxManager.indexDb, transformStreamOptions);

  var idxStreamOpts = _.extend({}, options);
  idxStreamOpts.keys = true;
  idxStreamOpts.values = true;

  idxStreamOpts.start = _.isArray(idxStreamOpts.start) ?
    idxStreamOpts.start : [idxStreamOpts.start];
  idxStreamOpts.end = _.isArray(idxStreamOpts.end) ?
    idxStreamOpts.end : [idxStreamOpts.end];

  if(idxStreamOpts.start.length !== idxStreamOpts.end.length ||
    idxStreamOpts.start.length !== idxManager.properties.length) {
      throw new Error("Query `start` or `end` do not match the specified index arity");
  }
  idxStreamOpts.start = idxManager.encodeIndex(null, idxStreamOpts.start, true, true);
  idxStreamOpts.end = idxManager.encodeIndex(undefined, idxStreamOpts.end, true, true);
  idxManager.indexDb.createReadStream(idxStreamOpts).pipe(indexToValue);
  var stream = indexToValue;

  if(options.transform) {
    var transform = isArray(options.transform) ? options.transform : [options.transform];
    while(transform.length > 0 ) {
      stream = stream.pipe(transform.shift());
    }
  }
  
  return stream;
};