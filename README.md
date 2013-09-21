level-indico
============

Create and manage indices for you leveldb database.

* No generic query system, provides just some flexible low level methods to access indexed data. You can use those to build your custom queries.
* Uses [bytewise](https://github.com/deanlandolt/bytewise) encoding for indices.
* Supports automatic indexing (using hooks).
* Works with changing fields.

[![NPM](https://nodei.co/npm/level-indico.png?downloads=true)](https://nodei.co/npm/level-indico/)

[![Build Status](https://travis-ci.org/mariocasciaro/level-indico.png)](https://travis-ci.org/mariocasciaro/level-indico)


## Usage

```javascript
//Indico require a sublevel-enabled db
var db = indico(sublevel(level('db', { valueEncoding: 'json' }));

//set indices on a sublevel
var posts = db.sublevel('posts');

//set a single index
db.ensureIndex('title');
db.ensureIndex('commentCount');
//set a compound index
db.ensureIndex('title', 'commentCount');

//[...] Put some data

//Now query...

//Find all all posts having title = "Hello"
db.findBy(['title'], {start: ['Hello'], end: ['Hello']}, function (err, data) {
  //...
});

//Find all all posts having title = "Hello" AND commentCount >= "1"
db.findBy(['title', 'commentCount'], {start: ['Hello', 1], end: ['Hello', undefined]}, function (err, data) {
  //...
});

//Get all posts sorted by commentCount desc
db.findBy(['commentCount'], {start: [null], end: [undefined]}, function (err, data) {
  //...
});

//Streaming version
db.streamBy(['commentCount'], {start: [null], end: [undefined]})
.on('data', function(data) {
//...
})
.on('close, function() {
//...
})

```


### ...More to come