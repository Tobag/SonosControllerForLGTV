'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = defer;

/**
 * Runs provided function on next iteration of the event loop
 *
 * @param {function} fn - function to run
 */
function defer(fn) {
  var nextTick = typeof setImmediate == 'function' ? setImmediate : (typeof process === 'undefined' ? 'undefined' : _typeof(process)) == 'object' && typeof process.nextTick == 'function' ? process.nextTick : null;

  if (nextTick) {
    nextTick(fn);
  } else {
    setTimeout(fn, 0);
  }
}