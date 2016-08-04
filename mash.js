var PENDING = 0;
var RESOLVED = 1;
var REJECTED = 2;

var wrapHandler = function (state, handler, p2) {
  return function (val) {
    var next = state == RESOLVED ? p2._resolve : p2._reject;
    var ret;

    if (!handler || typeof handler !== 'function') {
      return next(val);
    }

    try {
      ret = handler(val);
    } catch (e) {
      return p2._reject(e);
    }

    solve(ret, p2);
  };
};

var solve = function (val, p2) {
  if (val === p2) {
    return p2._reject(new TypeError('no promise circle allowed'));
  }

  var type = typeof val;

  if (type === 'function' || type === 'object' && val !== null) {
    try {
      then = val && val.then;
    } catch (e) {
      return p2._reject(e);
    }

    if (typeof then === 'function') {
      try {
        return then.call(val, function (val2) {
          solve(val2, p2);
        }, p2._reject);
      } catch (e) {
        return p2._reject(e);
      }
    }
  }

  return p2._resolve(val);
}

var genHandler = function (state, p) {
  return function (value) {
    if (p._state !== PENDING) return;
    p._state = state;
    p._value = value;
    p.next.forEach(function (obj) {
      setTimeout(function () {
        obj[state === RESOLVED ? 'onResolve' : 'onReject'](value);
      }, 0);
    });
  };
};

var MyPromise = function (executor) {
  var self = this;

  this.next = [];
  this._value = null;
  this._state = PENDING;
  this._resolve = genHandler(RESOLVED, self);
  this._reject  = genHandler(REJECTED, self);

  executor(this._resolve, this._reject);
};

MyPromise.prototype.then = function (onResolve, onReject) {
  var self = this;
  var p2   = new MyPromise(function () {});
  var ret;

  if (self._state === PENDING) {
    self.next.push({
      onResolve: wrapHandler(RESOLVED, onResolve, p2),
      onReject:  wrapHandler(REJECTED, onReject,  p2)
    });
  } else {
    setTimeout(function () {
      wrapHandler(self._state, self._state === RESOLVED ? onResolve : onReject, p2)(self._value);
    }, 0);
  }

  return p2;
};

MyPromise.prototype.catch = function (reject) {
  this.then(null, reject);
};

MyPromise.resolve = function (value) {
  return new Promise(function (resolve, reject) {
    resolve(value);
  });
};

MyPromise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

MyPromise.all = function (list) {
  var count = 0;
  var ret   = [];
  var p     = new MyPromise(function () {});
  var onResolve  = function (i) {
    return function (val) {
      ret[i] = val;
      if (++count >= list.length) p._resolve(ret);
    };
  };

  return new MyPromise(function (resolve, reject) {
    list.forEach(function (p2, i) {
      p2.then(onResolve(i), p._reject);
    });
  });
};

module.exports = MyPromise;
