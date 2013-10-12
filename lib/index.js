var _ = require('lodash'),
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
    return indexManager(db, idx).queryManager;
  };

  db.indico.index = function(idx) {
    return db.indico.ensureIndex(idx).queryManager;
  };

  db.indico.findBy = function(props, options, callback) {
    props = _.isArray(props) ? props : [props];
    var idxManager = indexManager(db, props, true);
    return idxManager.queryManager.find.call(idxManager.queryManager, options, callback);
  };


  db.indico.streamBy = function(props, options) {
    props = _.isArray(props) ? props : [props];
    var idxManager = indexManager(db, props, true);
    return idxManager.queryManager.stream.call(idxManager.queryManager, options);
  };

  return db;
};