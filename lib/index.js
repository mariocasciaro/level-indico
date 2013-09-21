var _ = require('lodash'),
  IndexToObjectStream = require('./IndexToObjectStream'),
  endpoint = require('endpoint'),
  indexManager = require('./indexManager');


module.exports = function(db) {
  db.ensureIndex = function() {
    var properties = Array.prototype.slice.call(arguments);
    indexManager(db, properties);
  };

  db.findBy = function(props, options, callback) {
    db.streamBy(props, options).pipe(endpoint({objectMode: true}, callback));
  };


  db.streamBy = function(props, options) {
    props = _.isArray(props) ? props : [props];
    var idxManager = indexManager(db, props);

    var transformStreamOptions = _.pick(_.extend({values: true, keys: false}, options), ['values', 'keys']);
    var indexToValue = new IndexToObjectStream(db, idxManager.indexDb, transformStreamOptions);

    var indexStreamOptions = _.extend({}, options);
    indexStreamOptions.keys = true;
    indexStreamOptions.values = true;

    indexStreamOptions.start = _.isArray(indexStreamOptions.start) ?
      indexStreamOptions.start : [indexStreamOptions.start];
    indexStreamOptions.end = _.isArray(indexStreamOptions.end) ?
      indexStreamOptions.end : [indexStreamOptions.end];

    indexStreamOptions.start.push(null);
    indexStreamOptions.end.push(undefined);

    indexStreamOptions.start = idxManager.encode(indexStreamOptions.start);
    indexStreamOptions.end = idxManager.encode(indexStreamOptions.end);
    idxManager.indexDb.createReadStream(indexStreamOptions).pipe(indexToValue);
    return indexToValue;
  };

  return db;
};