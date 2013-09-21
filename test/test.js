
var expect = require('chai').expect,
  indico = require('../lib'),
  level = require('levelup'),
  endpoint = require('endpoint'),
  async = require('async'),
  sublevel = require('level-sublevel');


describe('findBy', function() {
  var db;

  beforeEach(function(done) {
    async.series([
      function(callback) {
        require('leveldown').destroy('tmpdb', callback);
      },
      function(callback) {
        level('tmpdb', { valueEncoding: 'json' }, function(err, db2) {
          db = indico(sublevel(db2));
          callback(err);
        });
      }
    ], done);
  });

  afterEach(function(done) {
    db.close(done);
  });


  it('should return empty result if no match found', function(done) {
    var results = [];
    db.findBy('title', 'H', function(err, data) {
      expect(results).to.have.length(0);
      done();
    });
  });


  it('should return all objects for the given index', function(done) {
    db.ensureIndex('title');

    async.waterfall([
      function(callback) {
        db.put('123', {title: "Hello", "content": "World"}, callback);
      },
      function(callback) {
        db.put('124', {title: "Hello", "content": "World2"}, callback);
      },
      function(callback) {
        db.put('125', {title: "Helloo", "content": "World3"}, callback);
      },
      function(callback) {
        db.findBy('title', {start: 'Hello', end: 'Hello'}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(2);
          expect(data).to.have.deep.property("0.content", "World");
          expect(data).to.have.deep.property("1.content", "World2");
          callback(err);
        });
      }
    ], done);
  });


  it('should work with changing data', function(done) {
    db.ensureIndex('title');

    async.waterfall([
      function(callback) {
        db.put('123', {title: "Hello", "content": "World"}, callback);
      },
      function(callback) {
        db.put('124', {title: "Hello", "content": "World2"}, callback);
      },
      function(callback) {
        db.put('124', {title: "Hello2", "content": "World2"}, callback);
      },
      function(callback) {
        db.put('125', {title: "Helloo", "content": "World3"}, callback);
      },
      function(callback) {
        db.findBy('title', {start: 'Hello', end: 'Hello'}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(1);
          expect(data).to.have.deep.property("0.content", "World");
          callback(err);
        });
      }
    ], done);
  });



  it('should work with multiple indicies', function(done) {
    db.ensureIndex('title', 'tag');

    async.series([
      function(callback){
        db.put('123', {title: "Hello", tag: "M",content: "World"}, callback);
      },
      function(callback){
        db.put('124', {title: "Hello\x00",  tag: "M", "content": "World2"}, callback);
      },
      function(callback){
        db.put('125', {title: "Hello", tag: "\00M", "content": "World3"}, callback);
      },
      function(callback) {
        db.findBy(['title', 'tag'], {start: ['Hello', 'M'], end: ['Hello', 'M']}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(1);
          expect(data).to.have.deep.property("0.content", "World");
          callback(err);
        });
      }
    ], done);
  });


  it('can be used to sort by', function(done) {
    db.ensureIndex('title', 'len');

    async.series([
      function(callback){
        db.put('123', {title: "Hello", len: 31,content: "World1"}, callback);
      },
      function(callback){
        db.put('124', {title: "Helloo",  len: 2, "content": "World2"}, callback);
      },
      function(callback){
        db.put('125', {title: "Hello", len: 123, "content": "World3"}, callback);
      },
      function(callback){
        db.put('126', {title: "Hello", len: 1, "content": "World4"}, callback);
      },
      function(callback) {
        db.findBy(['title', 'len'], {start: ['Hello', null], end: ['Hello', undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(3);
          expect(data).to.have.deep.property("0.content", "World4");
          expect(data).to.have.deep.property("1.content", "World1");
          expect(data).to.have.deep.property("2.content", "World3");
          callback(err);
        });
      }
    ], done);
  });
});
