var Q = require('q'),
    setImmediate = global.setImmediate || process.nextTick;

module.exports = chan;
function chan(size) {
  if (typeof size === 'undefined') size = 0;
  var channel = [];
  var putQueue = [];
  var getQueue = [];

  var ch = {
    get: get,
    put: put,
    length: function() {
      return channel.length;
    }
  };

  function put(value, cb) {
    if (size && channel.length + 1 > size) {
      return putQueue.unshift({ value: value, cb: cb });
    }
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
    flushSelectQueue();
    flushGetQueue();
    if (cb) {
      return setImmediate(cb);
    } else {
      var _d = Q.defer();
      _d.resolve(value);
      return _d.promise;
    }
  }

  function get(cb) {
    if (!channel.length) {
      return getQueue.push({ cb: cb });
    }
    var promise = channel.pop();
    flushPutQueue();
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

  function flushGetQueue() {
    if (channel.length && getQueue.length) {
      setImmediate(function () {
        var item;
        while (channel.length && (item = getQueue.shift())) {
          ch.get(item.cb);
        }
      });
    }
  }

  function flushPutQueue() {
    if (putQueue.length && size && channel.length  < size) {
      setImmediate(function () {
        while (putQueue.length && ((size - channel.length) > 0)) {
          var item = putQueue.shift();
          ch.put(item.value, item.cb);
        }
      });
    }
  }

  return ch;
}

var selectQueue = [];

chan.select = select;
function select(channels, cb) {
  var d, ch;
  if (channels.length === 0) return;
  var ready = channels.filter(function (ch) {
    return ch.length() > 0;
  });
  if (ready.length === 0) {
    return selectQueue.push({
      channels: channels, cb: cb
    });
  } else if (ready.length === 1) {
    ch = ready[0]
  } else if (ready.length > 0) {
    var idx = Math.floor(Math.random() * ready.length);
    ch = ready[idx];
  }

  // remove from further notifications
  selectQueue = selectQueue.filter(function (item) {
    return !(item.channels === channels && item.cb === cb);
  });

  if (cb) return cb(null, ch);
}

function flushSelectQueue() {
  if (selectQueue.length) {
    setImmediate(function () {
      selectQueue.forEach(function (item) {
        select(item.channels, item.cb);
      });
    });
  }
}

function isPromise(obj) {
  return obj && 'function' == typeof obj.then;
}
