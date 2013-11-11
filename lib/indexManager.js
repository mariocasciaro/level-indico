var _ = require('lodash'),
  levelUtils = require('levelup/lib/util'),
  bops = require('bops'),
  QueryManager = require('./QueryManager'),
  objectPath = require('object-path');


module.exports = function(mainDb, properties, doNotCreate) {
  properties = normalizeProperties(properties);
  var idxName = indexName(properties);
  //check the index managers already registered into the mainDb
  var path = "indico._indexManagers."+idxName;
  if(!objectPath.get(mainDb, path)) {
    if(doNotCreate) {
      throw new Error("Index not defined for properties: " + properties);
    }

    objectPath.set(mainDb, path, new IndexManager(mainDb, properties));
  }
  return objectPath.get(mainDb, path);
};


function indexName(properties) {
  var res = "IDX(";
  _.each(properties, function(prop, idx) {
    res += idx === 0 ? "" : ",";
    res += prop[0];
    res += prop[1] ? ">" : "<";
  });

  res += ")";
  return res;
}

/**
 * Each property must be in the form:
 * ['propertyName', true | false]
 * 
 * false is ASC (default)
 * true is DESC
 */ 
function normalizeProperties(properties) {
  return _.map(properties, function(val) {
    if(_.isString(val)) {
      return [val, false];
    } else if(val.length === 2){
      return [val[0], val[1].toLowerCase() === "desc"];
    } else {
      throw new Error("Wrong format for index definition, ['property name', 'desc'|'asc'] required");
    }
  });
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
  this.queryManager = new QueryManager(mainDb, this);
}


/**
 * Encode a set of values corresponsing to an index
 *
 * @param key
 * @param values
 * @param recode if true will recode the value using the registered value encoder/decoder
 * @param keepUndefined if true will not recode the undefined (will stay undefined)
 */
IndexManager.prototype.encodeIndex = function(key, values, recode, keepUndefined) {
  var self = this;
  var compositeKey = _.map(this.properties, function(prop, idx) {
    var val = values[idx];
    if(recode && (!keepUndefined || val !== void 0)) {
      val = self.recodeValue(val);
    }

    if(prop[1]) {
      val = self.invert(val);
    }
    return val;
  });
  //we append the key so we can create a stream of entities with same indexes (but different keys)
  compositeKey.push(key);
  return this.encoding.encode(compositeKey).toString();
};



IndexManager.prototype.encodeObject = function(key, entity, recode) {
  var compositeKey = _.map(this.properties, function(prop) {
    return objectPath.get(entity, prop[0]);
  });
  //we append the key so we can create a stream of entities with same indexes (but different keys)
  return this.encodeIndex(key, compositeKey, recode).toString();
};


IndexManager.prototype.invert = function(value) {
  var self = this;
  
  if(_.isString(value)) {
    //String is handled as Buffer when inverted
    return self.invert(bops.from(value));
  } else if(value instanceof Date) {
    //Date is handled as Number
    return self.invert(value.valueOf());
  } else if(_.isNumber(value)) {
    //cannot invert 0
    if(value === 0) {
      return value;
    }
    
    var buf = bops.create(8);
    bops.writeDoubleBE(buf, value, 0);
    return bops.readDoubleBE(self.invert(buf), 0);
  } else if(bops.is(value)) {
    var bytes = [];
    for (var i = 0, end = value.length; i < end; ++i) {
      bytes.push(~bops.readUInt8(value, i));
    }
    return bops.from(bytes);
  } else if(_.isArray(value) || _.isObject(value)){
    var ret;
    if(_.isArray(value)) {
      ret = [];
    } else {
      ret = {};
    }
    
    _.each(value, function(val, key) {
      ret[key] = self.invert(val);
    });
    return ret;
  }
  
  else {
    return value;
  }
};


/**
 * This is a hack to find the value encoding for this sublevel. Consider to patch level-sublevel
 * 
 */ 
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

/**
 * Will encode/decode the values using the value encoder/decoder for this db.
 */ 
IndexManager.prototype.recodeValue = function(val) {
  var encoding = this.getValueEncoding();
  //we also encode the value, so it is the same as if it was returned by the db
  // e.g. JSON changes Date() to its string representation
  return levelUtils.decodeValue(levelUtils.encodeValue(val, {valueEncoding: encoding}), {valueEncoding: encoding});
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
