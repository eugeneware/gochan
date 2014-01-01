module.exports = chan;
function chan() {
  var channel = [];

  var ch = function(value, cb) {
    if (arguments.length === 2) {
      ch.put(value, cb);
    } else if (arguments.length === 1) {
      ch.get(value);
    }
  };

  ch.put = function (value, cb) {
    if (typeof value === 'function') {
      channel.unshift(value);
    } else {
      channel.unshift(function (cb) {
        cb(null, value);
      });
    }
    cb && setImmediate(cb);
  }

  ch.get = function (cb) {
    if (!channel.length) {
      return setImmediate(function () {
        ch(cb);
      });
    }
    var fn = channel.pop();
    fn(cb);
  };

  return ch;
}

