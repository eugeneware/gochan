var chan = require('..');

function builder(ch) {
  console.log('about to build');
  ch.put(42, function () {
    console.log('after building');
  });
}

function consumer(ch) {
  ch.get(function (err, value) {
    console.log('received ' + value);
  });
}

var ch = chan();
consumer(ch);
builder(ch);
