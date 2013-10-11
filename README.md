# Synopsis

Create and manage indices for your [leveldb](https://github.com/rvagg/node-levelup) database.

* Provides simple querying of indexed data
* Supports inverted sorting of indices (e.g. sort a Date from newer to older)
* Uses [bytewise](https://github.com/deanlandolt/bytewise) encoding for indices.
* Supports automatic indexing (using hooks).
* Works with changing fields (with some performance impact during reads).

[![NPM](https://nodei.co/npm/level-indico.png?downloads=true)](https://nodei.co/npm/level-indico/)

[![Build Status](https://travis-ci.org/mariocasciaro/level-indico.png)](https://travis-ci.org/mariocasciaro/level-indico) [![Dependency Status](https://david-dm.org/mariocasciaro/level-indico.png)](https://david-dm.org/mariocasciaro/level-indico)

# Stability

2 - Unstable

The API is in the process of settling, but has not yet had
sufficient real-world testing to be considered stable.

# Usage

```javascript
var indico = require('level-indico');

var db = sublevel(level('db', { valueEncoding: 'json' }));

//set indices on a sublevel
var posts = indico(db.sublevel('posts'));

/*
  post = {
    title: String,
    commentCount: Number,
    user: {
      name: String, 
      id: Name
    },
    createdDate: Date
  }

*/

//set a single index
posts.indico.ensureIndex(['title']);
//works with Date
posts.indico.ensureIndex(['createdDate']);
//works with nested properties
posts.indico.ensureIndex(['user.id']);
//set a compound index
posts.indico.ensureIndex(['title', 'commentCount']);
//set a descending index on 'createdDate' (so it sorts from newer to older)
posts.indico.ensureIndex([['createdDate', 'desc'], 'commentCount']);

//[...] Put some data

//Now query...

//SELECT * FROM posts WHERE title = 'Hello'
posts.indico.findBy(['title'], {start: ['Hello'], end: ['Hello']}, function (err, data) {
  //...
});

//SELECT * FROM posts WHERE title = 'Hello' AND commentCount >= 1
posts.indico.findBy(['title', 'commentCount'], {start: ['Hello', 1], end: ['Hello', undefined]}, function (err, data) {
  //...
});

//SELECT * FROM posts ORDER BY createdDate DESC
posts.indico.findBy([['createdDate', 'desc']], {start: [null], end: [undefined]}, function (err, data) {
  //...
});

//SELECT * FROM posts WHERE createdDate <= '1/1/2010' AND commentCount >= 10
posts.indico.findBy([['createdDate', 'desc'], 'commentCount'], {
    start: [new Date(2010,01,00), 10],
    end: [undefined, undefined]
  }, function (err, data) {
  //...
});

//SELECT * FROM posts ORDER BY createdDate ASC
posts.indico.streamBy([['createdDate', 'desc']], {start: [null], end: [undefined]})
.on('data', function(data) {
//...
})
.on(close, function() {
//...
})

```

# TODO

* Index nested objects (not just values)
* Full reindex


# Breaking changes

### 0.1 -> 0.2

`ensureIndex('title', 'content')`
becomes
`ensureIndex(['title', 'content'])`

# License

MIT