
var expect = require('chai').expect,
  indico = require('../lib'),
  level = require('levelup'),
  through = require('through'),
  async = require('async');


var DB_NAME = __dirname + '/../tmpdb';

describe('find', function() {
  var db;

  beforeEach(function(done) {
    async.series([
      function(callback) {
        require('leveldown').destroy(DB_NAME, callback);
      },
      function(callback) {
        level(DB_NAME, { valueEncoding: 'json'}, function(err, db2) {
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
    db.indico.ensureIndex(['title']);
    var results = [];
    db.indico.findBy('title', {start: 'Hello', end: 'Hello'}, function(err, data) {
      expect(results).to.have.length(0);
      done();
    });
  });


  it('should return all objects for the given index', function(done) {
    var titleIdx = db.indico.ensureIndex(['title']);

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
        titleIdx.find({start: 'Hello', end: 'Hello'}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(2);
          expect(data).to.have.deep.property("0.content", "World");
          expect(data).to.have.deep.property("1.content", "World2");
          callback(err);
        });
      }
    ], done);
  });
  
  
  it('should work with nested properties', function(done) {
    db.indico.ensureIndex(['title.main']);

    async.waterfall([
      function(callback) {
        db.put('123', {title: {main: "Hello"}, "content": "World"}, callback);
      },
      function(callback) {
        db.put('124', {title: {main: "Hello"}, "content": "World2"}, callback);
      },
      function(callback) {
        db.put('125', {title: {main: "Helloo"}, "content": "World3"}, callback);
      },
      function(callback) {
        db.indico.findBy('title.main', {start: 'Hello', end: 'Hello'}, function (err, data) {
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
    db.indico.ensureIndex(['title']);

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



  it('should work with compound index', function(done) {
    db.indico.ensureIndex(['title', 'tag']);

    async.series([
      function(callback){
        db.put('123', {title: "Hello", tag: "M", content: "World"}, callback);
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
  
  
  it('should work with dates', function(done) {
    db.indico.ensureIndex(['title']);
    db.indico.ensureIndex(['date']);

    async.series([
      function(callback){
        db.put('123', {title: "Hello", date: new Date(2010,1,1), content: "World1"}, callback);
      },
      function(callback){
        db.put('124', {title: "Helloo",  date: new Date(2012,1,1), "content": "World2"}, callback);
      },
      function(callback){
        db.put('125', {title: "Hello", date: new Date(2011,1,1), "content": "World3"}, callback);
      },
      function(callback) {
        db.indico.findBy(['date'], {start: [new Date(2011,1,1)], end: [undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(2);
          expect(data).to.have.deep.property("0.content", "World3");
          expect(data).to.have.deep.property("1.content", "World2");
          callback(err);
        });
      }
    ], done);
  });
  
  
  it('should work with compound index int/date', function(done) {
    db.indico.ensureIndex(['date', 'count']);

    async.series([
      function(callback){
        db.put('123', {date: new Date(2010,1,1), count: 1, content: "1"}, callback);
      },
      function(callback){
        db.put('124', {date: new Date(2011,1,1),  count: 2, content: "2"}, callback);
      },
      function(callback){
        db.put('125', {date: new Date(2013,1,1), count: 3, content: "3"}, callback);
      },
      function(callback) {
        db.indico.findBy(['date', 'count'], {start: [new Date(2011,1,1), 3], end: [undefined, undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(1);
          expect(data).to.have.deep.property("0.content", "3");
          callback(err);
        });
      }
    ], done);
  });


  it('can be used to sort by number ASC', function(done) {
    db.indico.ensureIndex(['title', 'len']);

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
  
  
  it('can be used to sort by Date DESC', function(done) {
    db.indico.ensureIndex([['date', 'desc']]);

    async.series([
      function(callback){
        db.put('123', {date: new Date(2010,1,1), content: "1"}, callback);
      },
      function(callback){
        db.put('124', {date: new Date(2013,1,1), content: "3"}, callback);
      },
      function(callback){
        db.put('125', {date: new Date(2011,1,1), content: "2"}, callback);
      },
      function(callback) {
        db.indico.findBy([['date', 'desc']], {start: [new Date(2011,1,1)], end: [undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(2);
          expect(data).to.have.deep.property("0.content", "2");
          expect(data).to.have.deep.property("1.content", "1");
          callback(err);
        });
      }
    ], done);
  });

  it('can be used to sort by Number DESC', function(done) {
    db.indico.ensureIndex([['nr', 'desc']]);

    async.series([
      function(callback){
        db.put('123', {nr: 7, content: "1"}, callback);
      },
      function(callback){
        db.put('124', {nr: -1, content: "3"}, callback);
      },
      function(callback){
        db.put('125', {nr: 0, content: "2"}, callback);
      },
      function(callback) {
        db.indico.findBy([['nr', 'desc']], {start: [null], end: [undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(3);
          expect(data).to.have.deep.property("0.content", "1");
          expect(data).to.have.deep.property("1.content", "2");
          expect(data).to.have.deep.property("2.content", "3");
          callback(err);
        });
      }
    ], done);
  });


  it('can be used to sort by first property ASC second property DESC', function(done) {
    db.indico.ensureIndex([['date', 'desc'], 'count']);

    async.series([
      function(callback){
        db.put('123', {date: new Date(2010,1,1), count: 5, content: "1"}, callback);
      },
      function(callback){
        db.put('124', {date: new Date(2010,1,1), count: 4, content: "3"}, callback);
      },
      function(callback){
        db.put('125', {date: new Date(2011,1,1), count: 9, content: "2"}, callback);
      },
      function(callback) {
        db.indico.findBy([['date', 'desc'], 'count'], {start: [new Date(2011,2,1), null], end: [undefined, undefined]}, function (err, data) {
          expect(err).to.not.exist;
          expect(data).to.have.length(3);
          expect(data).to.have.deep.property("0.content", "2");
          expect(data).to.have.deep.property("1.content", "3");
          expect(data).to.have.deep.property("2.content", "1");
          callback(err);
        });
      }
    ], done);
  });


  it('should throw an error if index is not defined', function() {
    db.indico.ensureIndex(['title', 'len']);

    function find() {
      db.indico.findBy(['title', 'lennn'], {start: ['Hello', null], end: ['Hello', undefined]});
    }

    expect(find).to.throw(/Index/);
  });

  it('should throw an error if start/end do not match index', function() {
    db.indico.ensureIndex(['title', 'len']);

    function find() {
      db.indico.findBy(['title', 'len'], {start: ['Hello'], end: ['Hello']});
    }

    expect(find).to.throw(/do not match/);
  });


  it('should work with deleted content', function(done) {
    db.indico.index(['title']);

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


describe('stream', function() {
  var db;

  beforeEach(function(done) {
    async.series([
      function(callback) {
        require('leveldown').destroy(DB_NAME, callback);
      },
      function(callback) {
        level(DB_NAME, { valueEncoding: 'json'}, function(err, db2) {
          db = indico(db2);
          callback(err);
        });
      }
    ], done);
  });

  afterEach(function(done) {
    db.close(done);
  });

  
  it('should stream all objects for the given index, including keys', function(done) {
    var titleIdx = db.indico.ensureIndex(['title']);

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
        var collected = [];
        db.indico.streamBy(['title'], {start: 'Hello', end: 'Hello', keys: true})
          .on('data', function (data) {
            collected.push(data);
          })
          .on('end', function() {
            expect(collected).to.have.length(2);
            expect(collected).to.have.deep.property("0.key", "123");
            expect(collected).to.have.deep.property("0.value.content", "World");
            expect(collected).to.have.deep.property("1.key", "124");
            expect(collected).to.have.deep.property("1.value.content", "World2");
            callback();
          })
          .on('error', function(err) {
            callback(err);
          });
      }
    ], done);
  });

  it('should stream only keys', function(done) {
    var titleIdx = db.indico.ensureIndex(['title']);

    async.waterfall([
      function(callback) {
        db.put('123', {title: "Hello", "content": "World"}, callback);
      },
      function(callback) {
        db.put('125', {title: "Helloo", "content": "World3"}, callback);
      },
      function(callback) {
        var collected = [];
        db.indico.streamBy(['title'], {start: 'Hello', end: 'Hello', values: false})
          .on('data', function (data) {
            collected.push(data);
          })
          .on('end', function() {
            expect(collected).to.have.length(1);
            expect(collected).to.have.deep.property("0", "123");
            callback();
          })
          .on('error', function(err) {
            callback(err);
          });
      }
    ], done);
  });


  it('should apply transform to stream', function(done) {
    var titleIdx = db.indico.ensureIndex(['title']);

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
        var collected = [];
        db.indico.streamBy(['title'], {start: 'Hello', end: 'Hello', 
          transform: through(function(data) {
            data.transformed = true;
            this.queue(data);
          })}
        )
          .on('data', function (data) {
            collected.push(data);
          })
          .on('end', function() {
            expect(collected).to.have.length(2);
            expect(collected).to.have.deep.property("0.transformed", true);
            expect(collected).to.have.deep.property("0.content", "World");
            expect(collected).to.have.deep.property("1.transformed", true);
            expect(collected).to.have.deep.property("1.content", "World2");
            callback();
          })
          .on('error', function(err) {
            callback(err);
          });
      }
    ], done);
  });
});
