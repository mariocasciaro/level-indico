var _ = require('lodash'),
  objectPath = require('object-path'),
  bytewise = require('bytewise');


module.exports = function(mainDb, properties, doNotCreate) {
  var indexName = propertiesName(properties);
  //check the index managers already registered into the mainDb
  if(!objectPath.get(mainDb, "_indico.indexManagers."+indexName)) {
    if(doNotCreate) {
      throw new Error("Index not defined for properties: " + properties);
    }

    objectPath.set(mainDb, "_indico.indexManagers."+indexName, new IndexManager(mainDb, properties));
  }
  return mainDb._indico.indexManagers[indexName];
};

function propertiesName(properties) {
  return properties && ("IDX_" + properties.join('|'));
}


function IndexManager(mainDb, properties) {
  if (!(this instanceof IndexManager))
    return new IndexManager(mainDb, properties);

  this.mainDb = mainDb;
  this.properties = properties;
  this.indexName = properties && ("IDX_" + properties.join('|'));
  this.indexDb = mainDb.sublevel(this.indexName);
  objectPath.set(this.indexDb, "_indico.indexManager", this);
  this.registerHooks();
}


IndexManager.prototype.encode = function(values) {
  return bytewise.encode(values);
};



IndexManager.prototype.encodeObject = function(key, entity) {
  var compositeKey = [];
  _.each(this.properties, function(prop) {
    compositeKey.push(objectPath.get(entity, prop));
  });
  //we append the key so we can create a stream of entities with same indexes (but different keys)
  compositeKey.push(key);
  return bytewise.encode(compositeKey);
};



IndexManager.prototype.registerHooks = function() {
  var self = this;

  //register hook
  self.removeHook = self.mainDb.pre(function(change, add) {
    if(change.type === 'put') {
      add({
        type: 'put',
        key: self.encodeObject(change.key, change.value),
        value: change.key,
        prefix: self.indexDb
      });
    }
  });
};
