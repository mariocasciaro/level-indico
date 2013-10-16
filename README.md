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
      id: String
    },
    createdDate: Date
  }

*/

//set a single index,  and save the index object for later use
var titleIndex = posts.indico.ensureIndex(['title']);
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
titleIndex.find({start: ['Hello'], end: ['Hello']}, function (err, data) {
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

# API

## db.indico

<a name="indico-ensureindex"></a>
### indico.ensureIndex(properties)

Sets an index on the specified properties.

__Arguments__

* `properties`: an `Array` listing the properties to index. Each item can be:
    * `String`: (e.g `'title'`) the property to include in the index, by default sorted Ascending.
    * `Array`: An array containing 2 `String` items:
        * `[0]`: The property name
        * `[1]`: The sorting order, one between `'desc'` and `'asc'`.

__Returns__

`QueryManager` for the specified index.

__Example__

```js
var titleIndex = db.indico.ensureIndex(['title']);
var dateAndCommentIndex = db.indico.ensureIndex([['createdDate', 'desc'], 'commentCount']);

```

<a name="indico-index"></a>
### indico.index(properties)

Alias of [indico.ensureIndex](#indico-ensureindex)

<a name="indico-findby"></a>
### indico.findBy(properties, options, callback)

Invokes [find](#querymanager-find) on the `QueryManager` corresponding to the specified `properties`

<a name="indico-streamby"></a>
### indico.streamBy(properties, options)

Invokes [stream](#querymanager-find) on the `QueryManager` corresponding to the specified `properties`

## QueryManager


<a name="querymanager-find"></a>
### find(options, callback)

Finds all values corresponding to the specified options

__Arguments__

* `options`:
    * `start`: `Array` specifying the index you wish to start the read at. It must have the same arity of the index.
    * `end`: `Array` specifying index you wish to end the read on. It must have the same arity of the index.
* `callback`: `function(err, data)`

Note: Since level-indico uses [bytewise](https://github.com/deanlandolt/bytewise) under the hood, it means that `null` will sort before any other value, while `undefined` will sort aftern any other value.

__Example__

```js
//SELECT * FROM posts WHERE title = 'Hello' ORDER BY commentCount ASC
posts.indico.findBy(['title', 'commentCount'], {start: ['Hello', null], end: ['Hello', undefined]}, function (err, data) {
  //...
});
```

<a name="querymanager-stream"></a>
### stream(options)

Same as [find](#querymanager-find), but returns a [ReadableStream](http://nodejs.org/docs/latest/api/stream.html#stream_readable_stream) for the specified query.


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

-----

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/mariocasciaro/level-indico/trend.png)](https://bitdeli.com/free "Bitdeli Badge")