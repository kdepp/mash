var Promise = require('../mash');

module.exports = {
  resolved: Promise.resolve,
  rejected: Promise.reject,
  deferred: function () {
    var p = new Promise(function () {});

    return {
      promise: p,
      resolve: p._resolve || p._onFulfilled,
      reject: p._reject || p._onRejected
    };
  }
};
