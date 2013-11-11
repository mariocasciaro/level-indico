var Transform = require('stream').Transform || require('readable-stream').Transform,
  _ = require('lodash'),
  util = require('util');

util.inherits(IndexToObjectStream, Transform);

function IndexToObjectStream(mainDb, indexDb, options) {
  if (!(this instanceof IndexToObjectStream))
    return new IndexToObjectStream(mainDb, indexDb, options);

  options = options ? _.clone(options) : {};
  options.objectMode = true;

  Transform.call(this, options);
  this._mainDb = mainDb;
  this._indexDb = indexDb;
  this._options = options;
}

IndexToObjectStream.prototype._transform = function(chunk, encoding, callback) {
  var self = this;
  var key = chunk.value;

  self._mainDb.get(key, function(err, value) {
    //if the object does not exists or contain not up to date info...then do some cleanup
    if((err && err.type === 'NotFoundError') ||
      self._indexDb.indico._indexManager.encodeObject(key, value) !== chunk.key)
    {
      self._indexDb.del(chunk.key, function(err) {
        if(err) {
          return callback(err);
        } else {
          //nothing to return
          return callback();
        }
      });
    } else if (err) {
      return callback();
    } else {
      if(self._options.values === false) {
        self.push(key);
      } else if(self._options.keys === false) {
        self.push(value);
      } else {
        self.push({
          key: key,
          value: value
        });
      }
      return callback();
    }
  });
};

module.exports = IndexToObjectStream;