var Promise = require('../promise');

module.exports = {
  resolved: Promise.resolve,
  rejected: Promise.reject,
  deferred: function () {
    var p = new Promise(function () {});

    return {
      promise: p,
      resolve: p._resolve,
      reject: p._reject
    };
  }
};
