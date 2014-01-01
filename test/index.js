var expect = require('expect.js'),
    path = require('path'),
    fs = require('fs'),
    thunkify = require('thunkify'),
    Q = require('q'),
    gochan = require('..');

function fixture(filename) {
  return path.join(__dirname, 'fixtures', filename);
}

describe('gochan', function() {
  it('should be able to use put and get functions', function(done) {
    var ch = gochan();

    var result = [];
    setImmediate(function () {
      result.push('before');
      ch.put(42, function () {
        result.push('after');
        expect(result).to.eql(['before', 'received 42', 'after']);
        done();
      });
    });

    setImmediate(function () {
      ch.get(function (err, value) {
        if (err) return done(err);
        result.push('received ' + value);
      });
    });
  });

  it('should be able to put values without callbacks', function(done) {
    var ch = gochan();
    for (var i = 0; i < 5; i++) {
      ch.put(i);
    }

    var results = [];
    var i = 0;
    (function next() {
      if (i++ < 5) {
        ch.get(function (err, value) {
          if (err) return done(err);
          results.push(value);
          setImmediate(next);
        });
      } else {
        expect(results).to.eql([0, 1, 2, 3, 4]);
        done();
      }
    })();
  });

  it('should be able to do async node IO', function(done) {
    var ch = gochan();
    ch.put(function (cb) {
      fs.readFile(fixture('sample.txt'), { encoding: 'utf8' }, cb);
    });

    ch.get(function (err, value) {
      if (err) return done(err);
      expect(value).to.be.a('string');
      expect(value.length).to.equal(32);
      done();
    });
  });

  it('should be able to use thunkify', function(done) {
    var ch = gochan();
    var readFile = thunkify(fs.readFile);
    ch.put(readFile(fixture('sample.txt'), { encoding: 'utf8' }));

    ch.get(function (err, value) {
      if (err) return done(err);
      expect(value).to.be.a('string');
      expect(value.length).to.equal(32);
      done();
    });
  });

  it('should be able to put promises on the channel', function(done) {
    var ch = gochan();
    function makepromise(val) {
      var d = Q.defer();
      setImmediate(function () {
        d.resolve(val);
      });
      return d.promise;
    }

    ch.put(makepromise(42));
    ch.get(function (err, value) {
      if (err) return done(err);
      expect(value).to.equal(42);
      done();
    });
  });

  it('should be able to get promises from the channel', function(done) {
    var ch = gochan();
    var readFile = thunkify(fs.readFile);
    ch.put(readFile(fixture('sample.txt'), { encoding: 'utf8' }));

    ch.get().then(function (value) {
      expect(value).to.be.a('string');
      expect(value.length).to.equal(32);
      done();
    });
  });

  it('should be able to get the length of the channel', function(done) {
    var ch = gochan();
    ch.put(1);
    expect(ch.length()).to.equal(1);
    ch.put(2);
    expect(ch.length()).to.equal(2);
    ch.get(function (err, value) {
      expect(ch.length()).to.equal(1);
      done();
    });
  });

  it('should be able to select between multiple channels', function(done) {
    var a = gochan();
    var b = gochan();

    gochan.select([a, b], function (err, ch) {
      expect(ch).to.equal(a);
      done();
    });

    a.put(42);
  });

  it('should be able to put with promises', function(done) {
    var ch = gochan();
    ch.put(42).then(function (value) {
      expect(value).to.equal(42);
      done();
    });
  });

  it('should be able to have channel sizes', function(done) {
    var ch = gochan(1);
    ch.put(42, function () {
      expect(ch.length()).to.equal(1);
      setTimeout(function () {
        ch.get(function (err, value) {
          expect(value).to.equal(42);
        });
      }, 50);
    });
    ch.put(84, function (err) {
      expect(ch.length()).to.equal(1);
      ch.get(function (err, value) {
        expect(value).to.equal(84);
        done();
      });
    });
  });

  it('should be able to queue up gets efficiently', function(done) {
    var ch = gochan();
    ch.get(function (err, value) {
      expect(value).to.equal(42);
      ch.put(84);
    });
    ch.get(function (err, value) {
      expect(value).to.equal(84);
      done();
    });
    setTimeout(function () {
      ch.put(42);
    }, 50);
  });
});
