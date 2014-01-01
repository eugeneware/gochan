# gochan

golang inspired channels for doing CSP-style concurrency in node.js.

This library is to give node.js without generators the ability to use golang
style channels for doing concurrent programming.

[![build status](https://secure.travis-ci.org/eugeneware/gochan.png)](http://travis-ci.org/eugeneware/gochan)

## Installation

This module is installed via npm:

``` bash
$ npm install gochan
```

## Example Usage

### Create a channel and synchronize two processes

``` js
// simple.js

// Create a new channel
var gochan = require('gochan');

// This function sends messages to the channel
function builder(ch) {
  console.log('about to build');
  ch.put(42, function () {
    console.log('after building');
  });
}

// This function waits and receives a message from the channel
function consumer(ch) {
  ch.get(function (err, value) {
    console.log('received ' + value);
  });
}

var ch = gochan();
consumer(ch);
builder(ch);
```

This will result in the following output:

``` bash
$ node examples/simple.js
about to build
received 42
after building
```

Note how the order of execution is deterministic. Even though the consumer
was run first, it happily waited until there was a message in the channel.

Similarly, the builder can't continue after putting something into the channel
unless there is somone to read it.

### Listen to multiple channels, and only proceed when there is a message

This emulates the golang "select" primitive:

``` js
// two channels
var a = gochan();
var b = gochan();

// wait until there is a message on any of the channels
gochan.select([a, b], function (err, ch) {
  // the channel ch, will be the "a" channel
});

// put something on the "a" channel
a.put(42);
```

## API

### var gochan = require('gochan');

Creates a new channel factory that can make channels.

### gochan(size)

Creates a new instance of a channel.

* ```size``` - The size of the channel. By default the size is 0, which is
  essentially infinite. To get golang-like behaviour where the size of a
  channel is only one, and thus forces channel getters and setters to
  synchronize around channel communication, set this value to be 1.

Eg:

``` js
var gochan = require('gochan');
var ch = gochan();
```

### ch.put(val, cb)

Puts a raw value, a callback function, or a promise on the channel.

* ```val``` - A raw value, a callback function (signature
  ```function(err, value)```) or a promise.
* ```cb``` - If provided, this callback will be called. If ommitted, then a
  promise will be returned.

NB: If the channel is a fixed size and there isn't remove for the message, then
the put operation will essentially stall until there is space for the message.
So the callback won't be called into there is room.

``` js
var gochan = require('gochan');
var ch = gochan();
ch.put(42, function () {
  // do something after put
});

var fs = require('fs');
ch.put(function (cb) {
    fs.readFile('/etc/passwd', { encoding: 'utf8' }, cb);
  },
  function () {
    // do something after put
  });

ch.put(42).then(function () {
  // ommit callback and get a promise
});
```

### ch.get(cb)

Gets a value from the channel. If there is nothing in the channel, then the
callback won't be called until there is a message on the channel.

* ```cb``` - If provided, this callback will be called. If ommitted, then a
  promise will be returned.

NB: Even though node callback functions and values and promises can be put
onto the channel, the final value that gets retrieved will be a final value.

``` js
var gochan = require('gochan');
var ch = gochan();
var fs = require('fs');
ch.put(function (cb) {
    fs.readFile('/etc/passwd', { encoding: 'utf8' }, cb);
  },
  function () {
    // do something after put
  });

ch.get(function (err, data) {
  // data will contain the contents of the file
});
```

### gochan.select(arrChannels, cb)

Waits until there is data on an array of channels. This function attempts to
emultate the golang ```select``` primitive.

* ```arrChannels``` - An array of channels that will be monitored until there
  is activity on the channel. Once there is, the callback will be called.
* ```cb``` - Called when there is data on a channel. The first argument is an
  error, and the second parameter is the channel with the data. You'll still
  need to call ```.get()``` on the channel to get the data.

``` js
var gochan = require('gochan');
var a = gochan();
var b = gochan();

gochan.select([a, b], function (err, ch) {
  expect(ch).to.equal(a);
  done();
});

a.put(42);
```
