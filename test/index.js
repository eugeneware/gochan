var expect = require('expect.js'),
    path = require('path'),
    fs = require('fs'),
    thunkify = require('thunkify'),
    gochan = require('..');

function fixture(filename) {
  return path.join(__dirname, 'fixtures', filename);
}

describe('gochan', function() {
  it('should be able to do basic message passing', function(done) {
    var ch = gochan();

    var result = [];
    setImmediate(function () {
      result.push('before');
      ch(42, function () {
        result.push('after');
        expect(result).to.eql(['before', 'received 42', 'after']);
        done();
      });
    });

    setImmediate(function () {
      ch(function (err, value) {
        if (err) return done(err);
        result.push('received ' + value);
      });
    });
  });

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
});
