
var expect = require('chai').expect,
  indico = require('../lib'),
  level = require('levelup'),
  async = require('async');


describe('findBy', function() {
  var db;

  beforeEach(function(done) {
    async.series([
      function(callback) {
        require('leveldown').destroy('tmpdb', callback);
      },
      function(callback) {
        level('tmpdb', { valueEncoding: 'json'}, function(err, db2) {
          db = indico(db2);
          callback(err);
        });
      }
    ], done);
  });

  afterEach(function(done) {
    db.close(done);
  });


  it('should return empty result if no match found', function(done) {
    db.indico.ensureIndex('title');
    var results = [];
    db.indico.findBy('title', {start: 'Hello', end: 'Hello'}, function(err, data) {
      expect(results).to.have.length(0);
      done();
    });
  });


  it('should return all objects for the given index', function(done) {
    db.indico.ensureIndex('title');

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
        db.indico.findBy('title', {start: 'Hello', end: 'Hello'}, function (err, data) {
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
    db.indico.ensureIndex('title');

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
        db.indico.findBy('title', {start: 'Hello', end: 'Hello'}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(1);
          expect(data).to.have.deep.property("0.content", "World");
          callback(err);
        });
      }
    ], done);
  });



  it('should work with multiple indicies', function(done) {
    db.indico.ensureIndex('title', 'tag');

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
        db.indico.findBy(['title', 'tag'], {start: ['Hello', 'M'], end: ['Hello', 'M']}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(1);
          expect(data).to.have.deep.property("0.content", "World");
          callback(err);
        });
      }
    ], done);
  });


  it('can be used to sort by', function(done) {
    db.indico.ensureIndex('title', 'len');

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
        db.indico.findBy(['title', 'len'], {start: ['Hello', null], end: ['Hello', undefined]}, function (err, data) {
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



  it('should work with dates', function(done) {
    db.indico.ensureIndex('title');
    db.indico.ensureIndex('date');

    async.series([
      function(callback){
        db.put('123', {title: "Hello", date: new Date(), content: "World1"}, callback);
      },
      function(callback){
        db.put('124', {title: "Helloo",  date: new Date(10000), "content": "World2"}, callback);
      },
      function(callback){
        db.put('125', {title: "Hello", date: new Date(1), "content": "World3"}, callback);
      },
      function(callback) {
        db.indico.findBy(['date'], {start: [null], end: [undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(3);
          expect(data).to.have.deep.property("0.content", "World3");
          expect(data).to.have.deep.property("1.content", "World2");
          expect(data).to.have.deep.property("2.content", "World1");
          callback(err);
        });
      }
    ], done);
  });


  it('should throw an error if index is not defined', function() {
    db.indico.ensureIndex('title', 'len');

    function find() {
      db.indico.findBy(['title', 'lennn'], {start: ['Hello', null], end: ['Hello', undefined]});
    }

    expect(find).to.throw(/Index/);
  });

  it('should throw an error if start/end do not match index', function() {
    db.indico.ensureIndex('title', 'len');

    function find() {
      db.indico.findBy(['title', 'len'], {start: ['Hello'], end: ['Hello']});
    }

    expect(find).to.throw(/do not match/);
  });


  it('should work with deleted content', function(done) {
    db.indico.ensureIndex('title');

    async.waterfall([
      function(callback) {
        db.put('123', {title: "Hello", "content": "World"}, callback);
      },
      function(callback) {
        db.put('124', {title: "Hello", "content": "World2"}, callback);
      },
      function(callback) {
        db.del('124', callback);
      },
      function(callback) {
        db.put('125', {title: "Helloo", "content": "World3"}, callback);
      },
      function(callback) {
        db.indico.findBy('title', {start: 'Hello', end: 'Hello'}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(1);
          expect(data).to.have.deep.property("0.content", "World");
          callback(err);
        });
      }
    ], done);
  });
});
