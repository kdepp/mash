var debug = require('debug')('byop');

var STATE = {
  PENDING: 'PENDING',
  FULLFILLED: 'FULLFILLED',
  REJECTED: 'REJECTED'
};

function isFunction(fn) {
  return typeof fn === 'function';
}

function isThenable(fn) {
  return fn && typeof fn.then === 'function';
}

function nextTick(fn) {
  if (process && process.nextTick) {
    process.nextTick(fn);
  } else {
    setTimeout(fn, 0);
  }
}

function id(x) {
  return x;
}

function handle(value, resolve, reject) {
  debug('in handle %s', value);
  if (isThenable(value)) {
    return value.then(resolve, reject);
  } else {
    return resolve(value);
  }
}

function safeCall(self, fn, param) {
  var ret = fn(param);
  if (self === ret) {
    throw new TypeError('Promise should not resolve or reject with itself');
  }
  return ret;
}

function Promise(fn) {
  this._then_list = [];
  this._state = STATE.PENDING;
  this._value = null;
  this._error = null;

  var self = this;
  var trigger = function () {
    debug('in trigger, state: %s, value: %s, error: %s', self._state, self._value, self._error);
    switch (self._state) {
      case STATE.FULLFILLED:
        for (var i = 0, l = self._then_list.length; i < l; i ++) {
          var tuple = self._then_list[i];
          try {
            tuple.onResolve(self._value);
          } catch (e) {
            tuple.onReject(e, true);
          }
        }
        break;
      case STATE.REJECTED:
        for (var i = 0, l = self._then_list.length; i < l; i ++) {
          var tuple = self._then_list[i];
          try {
            tuple.onReject(self._error);
          } catch (e) {
            tuple.onReject(e, true);
          }
        }
        break;
      case STATE.PENDING:
      default:
        break;
    }
  };
  var resolve = function (val) {
    if (val == self) {
      throw new TypeError('Promise should not resolve with itself as the value');
    }

    nextTick(function () {
      if (self._state !== STATE.PENDING)  return;
      self._state = STATE.FULLFILLED;
      self._value = val;
      trigger();
    });
  };
  var reject = function (error) {
    if (error == self) {
      throw new TypeError('Promise should not reject with itself as the error');
    }

    nextTick(function () {
      if (self._state !== STATE.PENDING)  return;
      self._state = STATE.REJECTED;
      self._error = error;
      trigger();
    });
  };

  this._resolve = resolve;
  this._reject = reject;

  nextTick(function () {
    fn(resolve, reject);
  });

  return this;
}

Promise.prototype.then = function (onResolve, onReject) {
  var self = this;

  var that = new Promise(function (resolve, reject) {
    switch (self._state) {
      case STATE.FULLFILLED:
        try {
          if (isFunction(onResolve)) {
            handle(safeCall(that, onResolve, self._value), resolve, reject);
          } else {
            resolve(self._value);
          }
        } catch (e) {
          reject(e);
        }
        break;

      case STATE.REJECTED:
        try {
          if (isFunction(onReject)) {
            handle(safeCall(that, onReject, self._error), resolve, reject);
          } else {
            reject(self._error);
          }
        } catch (e) {
          reject(e);
        }
        break;

      case STATE.PENDING:
      default:
        debug('then_list push');
        self._then_list.push({
          onResolve: function (val) {
            handle(val, function (val) {
              if (isFunction(onResolve)) {
                handle(safeCall(that, onResolve, val), resolve, reject);
              } else {
                resolve(val);
              }
            }, function (err) {
              if (isFunction(onReject)) {
                handle(safeCall(that, onReject, err), resolve, reject);
              } else {
                reject(err);
              }
            });
          },
          onReject:  function (err, bypass) {
            if (!bypass && isFunction(onReject)) {
              handle(safeCall(that, onReject, err), resolve, reject);
            } else {
              reject(err);
            }
          }
        });
    }
  });

  return that;
};

Promise.resolve = function (val) {
  return new Promise(function (resolve, reject) {
    resolve(val);
  });
};
Promise.reject = function (err) {
  return new Promise(function (resolve, reject) {
    reject(err);
  });
};
Promise.all = function (list) {

};
Promise.race = function (list) {

};

module.exports = Promise;
