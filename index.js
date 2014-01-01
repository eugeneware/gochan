var Q = require('q');

module.exports = chan;
function chan() {
  var channel = [];

  var ch = {
    get: get,
    put: put,
    length: function() {
      return channel.length;
    }
  };

  function put(value, cb) {
    var d;
    if (typeof value === 'function') {
      d = Q.defer();
      var fn = value;
      fn(function (err, value) {
        if (err) return d.reject(err);
        d.resolve(value);
      });
      channel.unshift(d.promise);
    } else if (isPromise(value)) {
      channel.unshift(value);
    } else {
      d = Q.defer();
      d.resolve(value);
      channel.unshift(d.promise);
    }
    cb && setImmediate(cb);
  }

  function get (cb) {
    if (!channel.length) {
      return setImmediate(function () {
        ch.get(cb);
      });
    }
    var promise = channel.pop();
    if (typeof cb === 'undefined') {
      return promise;
    } else {
      promise.then(
        function (value) {
          cb(null, value);
        },
        function (err) {
          cb(err);
        });
    }
  };

  return ch;
}

chan.select = select;
function select(channels, cb) {
  if (channels.length === 0) return;
  var ready = channels.filter(function (ch) {
    return ch.length() > 0;
  });
  if (ready.length === 0) {
    return setImmediate(function () {
      select(channels, cb);
    });
  } else if (ready.length === 1) {
    return cb(null, ready[0]);
  } else if (ready.length > 0) {
    var idx = Math.floor(Math.random() * ready.length);
    return cb(null, ready[idx]);
  }
}

function isPromise(obj) {
  return obj && 'function' == typeof obj.then;
}
