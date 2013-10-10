var _ = require('lodash'),
  IndexToObjectStream = require('./IndexToObjectStream'),
  endpoint = require('endpoint'),
  sublevel = require('level-sublevel'),
  indexManager = require('./indexManager');


module.exports = function(db) {
  if(!db.sublevel) {
    //install sublevel
    db = sublevel(db);
  }

  if(db.indico) {
    return db;
  }

  db.indico = {};

  db.indico.ensureIndex = function(idx) {
    indexManager(db, idx);
  };

  db.indico.findBy = function(props, options, callback) {
    db.indico.streamBy(props, options).pipe(endpoint({objectMode: true}, callback));
  };


  db.indico.streamBy = function(props, options) {
    props = _.isArray(props) ? props : [props];
    var idxManager = indexManager(db, props, true);

    var transformStreamOptions = _.pick(_.extend({values: true, keys: false}, options), ['values', 'keys']);
    var indexToValue = new IndexToObjectStream(db, idxManager.indexDb, transformStreamOptions);

    var idxStreamOpts = _.extend({}, options);
    idxStreamOpts.keys = true;
    idxStreamOpts.values = true;

    idxStreamOpts.start = _.isArray(idxStreamOpts.start) ?
      idxStreamOpts.start : [idxStreamOpts.start];
    idxStreamOpts.end = _.isArray(idxStreamOpts.end) ?
      idxStreamOpts.end : [idxStreamOpts.end];

    if(idxStreamOpts.start.length !== idxStreamOpts.end.length || idxStreamOpts.start.length !== props.length) {
      throw new Error("Query `start` or `end` do not match the specified index arity");
    }
    idxStreamOpts.start = idxManager.encodeIndex(null, idxStreamOpts.start, true, true);
    idxStreamOpts.end = idxManager.encodeIndex(undefined, idxStreamOpts.end, true, true);
    idxManager.indexDb.createReadStream(idxStreamOpts).pipe(indexToValue);
    return indexToValue;
  };

  return db;
};