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
    if (typeof value === 'function') {
      channel.unshift(value);
    } else if (isPromise(value)) {
      channel.unshift(function (cb) {
        value.then(
          function (result) {
            cb(null, result);
          },
          function (err) {
            cb(err);
          });
      });
    } else {
      channel.unshift(function (cb) {
        cb(null, value);
      });
    }
    cb && setImmediate(cb);
  }

  function get (cb) {
    if (!channel.length) {
      return setImmediate(function () {
        ch(cb);
      });
    }
    var fn = channel.pop();
    if (typeof cb === 'undefined') {
      var d = Q.defer();
      fn(function (err, result) {
        if (err) return d.reject(err);
        d.resolve(result);
      });
      return d.promise;
    } else {
      fn(cb);
    }
  };

  return ch;
}

function isPromise(obj) {
  return obj && 'function' == typeof obj.then;
}
