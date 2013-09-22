level-indico
============

Create and manage indices for your [leveldb](https://github.com/rvagg/node-levelup) database.

* No generic query system, provides just some flexible low level methods to access indexed data. You can use those to build your custom queries.
* Uses [bytewise](https://github.com/deanlandolt/bytewise) encoding for indices.
* Supports automatic indexing (using hooks).
* Works with changing fields (with some performance impact during reads).

[![NPM](https://nodei.co/npm/level-indico.png?downloads=true)](https://nodei.co/npm/level-indico/)

[![Build Status](https://travis-ci.org/mariocasciaro/level-indico.png)](https://travis-ci.org/mariocasciaro/level-indico) [![Dependency Status](https://david-dm.org/mariocasciaro/level-indico.png)](https://david-dm.org/mariocasciaro/level-indico)


## Usage

```javascript
var db = indico(level('db', { valueEncoding: 'json' });

//set indices on a sublevel
var posts = db.sublevel('posts');

//set a single index
db.indico.ensureIndex('title');
db.indico.ensureIndex('commentCount');
//set a compound index
db.indico.ensureIndex('title', 'commentCount');

//[...] Put some data

//Now query...

//Find all all posts having title = "Hello"
db.indico.findBy(['title'], {start: ['Hello'], end: ['Hello']}, function (err, data) {
  //...
});

//Find all all posts having title = "Hello" AND commentCount >= "1"
db.indico.findBy(['title', 'commentCount'], {start: ['Hello', 1], end: ['Hello', undefined]}, function (err, data) {
  //...
});

//Get all posts sorted by commentCount desc
db.indico.findBy(['commentCount'], {start: [null], end: [undefined]}, function (err, data) {
  //...
});

//Streaming version
db.indico.streamBy(['commentCount'], {start: [null], end: [undefined]})
.on('data', function(data) {
//...
})
.on(close, function() {
//...
})

```


### ...More to come