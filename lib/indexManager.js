var _ = require('lodash'),
  levelUtils = require('levelup/lib/util'),
  objectPath = require('object-path');


module.exports = function(mainDb, properties, doNotCreate) {
  var idxName = indexName(properties);
  //check the index managers already registered into the mainDb
  if(!objectPath.get(mainDb, "indico._indexManagers."+idxName)) {
    if(doNotCreate) {
      throw new Error("Index not defined for properties: " + properties);
    }

    objectPath.set(mainDb, "indico._indexManagers."+idxName, new IndexManager(mainDb, properties));
  }
  return mainDb.indico._indexManagers[idxName];
};


function indexName(properties) {
  return properties && ("IDX(" + properties.join(',') + ")");
}


function IndexManager(mainDb, properties) {
  if (!(this instanceof IndexManager))
    return new IndexManager(mainDb, properties);

  this.mainDb = mainDb;
  this.properties = properties;
  this.indexName = indexName(properties);
  this.indexDb = mainDb.sublevel(this.indexName);
  objectPath.set(this.indexDb, "indico._indexManager", this);
  this.registerHooks();
}


IndexManager.prototype.encode = function(values, recode, keepUndefined) {
  var self = this;
  if(recode) {
    if(_.isArray(values)) {
      values = _.map(values, function(val) {
        if(keepUndefined && val === void 0) {
          return val;
        }
        return self.recodeValue(val);
      });
    } else {
      if(!keepUndefined || values !== void 0) {
        values = self.recodeValue(values);
      }
    }
  }
  return this.encoding.encode(values).toString();
};


//This is a hack to find the value encoding for this sublevel. Consider to patch level-sublevel
IndexManager.prototype.getValueEncoding = function() {
  //TODO cache results
  var currentDb = this.indexDb;
  while(currentDb) {
    var options = currentDb.options;
    if(options.valueEncoding) {
      return options.valueEncoding;
    }
    currentDb = currentDb._parent;
  }

  throw new Error("Cannot find value encoding");
};


IndexManager.prototype.encoding = require('bytewise/hex');

IndexManager.prototype.recodeValue = function(val) {
  var encoding = this.getValueEncoding();
  //we also encode the value, so it is the same as if it was returned by the db
  // e.g. JSON changes Date() to its string representation
  return levelUtils.decodeValue(levelUtils.encodeValue(val, {valueEncoding: encoding}), {valueEncoding: encoding});
};

IndexManager.prototype.encodeObject = function(key, entity, recode) {
  var self = this;
  var compositeKey = [];
  _.each(this.properties, function(prop) {
    var val = objectPath.get(entity, prop);
    compositeKey.push(val);
  });
  //we append the key so we can create a stream of entities with same indexes (but different keys)
  compositeKey.push(key);
  return this.encode(compositeKey, recode).toString();
};



IndexManager.prototype.registerHooks = function() {
  var self = this;

  //register hook
  self.removeHook = self.mainDb.pre(function(change, add) {
    if(change.type === 'put') {
      add({
        type: 'put',
        key: self.encodeObject(change.key, change.value, true),
        value: change.key,
        prefix: self.indexDb
      });
    }
  });
};
