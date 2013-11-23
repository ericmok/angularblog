(function() {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    var mod, deps, callback, reified, exports;

    mod = registry[name];

    if (!mod) {
      throw new Error("Module '" + name + "' not found.");
    }

    deps = mod.deps;
    callback = mod.callback;
    reified = [];

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(deps[i]));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;
  };
})();
(function() {
/*globals Em:true ENV */

/**
@module ember
@submodule ember-metal
*/

/**
  All Ember methods and functions are defined inside of this namespace. You
  generally should not add new properties to this namespace as it may be
  overwritten by future versions of Ember.

  You can also use the shorthand `Em` instead of `Ember`.

  Ember-Runtime is a framework that provides core functions for Ember including
  cross-platform functions, support for property observing and objects. Its
  focus is on small size and performance. You can use this in place of or
  along-side other cross-platform libraries such as jQuery.

  The core Runtime framework is based on the jQuery API with a number of
  performance optimizations.

  @class Ember
  @static
  @version 1.1.2
*/

if ('undefined' === typeof Ember) {
  // Create core object. Make it act like an instance of Ember.Namespace so that
  // objects assigned to it are given a sane string representation.
  Ember = {};
}

// Default imports, exports and lookup to the global object;
var imports = Ember.imports = Ember.imports || this;
var exports = Ember.exports = Ember.exports || this;
var lookup  = Ember.lookup  = Ember.lookup  || this;

// aliases needed to keep minifiers from removing the global context
exports.Em = exports.Ember = Em = Ember;

// Make sure these are set whether Ember was already defined or not

Ember.isNamespace = true;

Ember.toString = function() { return "Ember"; };


/**
  @property VERSION
  @type String
  @default '1.1.2'
  @final
*/
Ember.VERSION = '1.1.2';

/**
  Standard environmental variables. You can define these in a global `ENV`
  variable before loading Ember to control various configuration
  settings.

  @property ENV
  @type Hash
*/

if ('undefined' === typeof ENV) {
  exports.ENV = {};
}

// We disable the RANGE API by default for performance reasons
if ('undefined' === typeof ENV.DISABLE_RANGE_API) {
  ENV.DISABLE_RANGE_API = true;
}


Ember.ENV = Ember.ENV || ENV;

Ember.config = Ember.config || {};

/**
  Hash of enabled Canary features. Add to before creating your application.

  @property FEATURES
  @type Hash
*/

Ember.FEATURES = {};

/**
  Test that a feature is enabled. Parsed by Ember's build tools to leave
  experimental features out of beta/stable builds.

  @method isEnabled
  @param {string} feature
*/

Ember.FEATURES.isEnabled = function(feature) {
  return Ember.FEATURES[feature];
};

// ..........................................................
// BOOTSTRAP
//

/**
  Determines whether Ember should enhances some built-in object prototypes to
  provide a more friendly API. If enabled, a few methods will be added to
  `Function`, `String`, and `Array`. `Object.prototype` will not be enhanced,
  which is the one that causes most trouble for people.

  In general we recommend leaving this option set to true since it rarely
  conflicts with other code. If you need to turn it off however, you can
  define an `ENV.EXTEND_PROTOTYPES` config to disable it.

  @property EXTEND_PROTOTYPES
  @type Boolean
  @default true
*/
Ember.EXTEND_PROTOTYPES = Ember.ENV.EXTEND_PROTOTYPES;

if (typeof Ember.EXTEND_PROTOTYPES === 'undefined') {
  Ember.EXTEND_PROTOTYPES = true;
}

/**
  Determines whether Ember logs a full stack trace during deprecation warnings

  @property LOG_STACKTRACE_ON_DEPRECATION
  @type Boolean
  @default true
*/
Ember.LOG_STACKTRACE_ON_DEPRECATION = (Ember.ENV.LOG_STACKTRACE_ON_DEPRECATION !== false);

/**
  Determines whether Ember should add ECMAScript 5 shims to older browsers.

  @property SHIM_ES5
  @type Boolean
  @default Ember.EXTEND_PROTOTYPES
*/
Ember.SHIM_ES5 = (Ember.ENV.SHIM_ES5 === false) ? false : Ember.EXTEND_PROTOTYPES;

/**
  Determines whether Ember logs info about version of used libraries

  @property LOG_VERSION
  @type Boolean
  @default true
*/
Ember.LOG_VERSION = (Ember.ENV.LOG_VERSION === false) ? false : true;

/**
  Empty function. Useful for some operations. Always returns `this`.

  @method K
  @private
  @return {Object}
*/
Ember.K = function() { return this; };


// Stub out the methods defined by the ember-debug package in case it's not loaded

if ('undefined' === typeof Ember.assert) { Ember.assert = Ember.K; }
if ('undefined' === typeof Ember.warn) { Ember.warn = Ember.K; }
if ('undefined' === typeof Ember.debug) { Ember.debug = Ember.K; }
if ('undefined' === typeof Ember.deprecate) { Ember.deprecate = Ember.K; }
if ('undefined' === typeof Ember.deprecateFunc) {
  Ember.deprecateFunc = function(_, func) { return func; };
}

/**
  Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
  jQuery master. We'll just bootstrap our own uuid now.

  @property uuid
  @type Number
  @private
*/
Ember.uuid = 0;

// ..........................................................
// LOGGER
//

function consoleMethod(name) {
  var consoleObj;
  if (imports.console) {
    consoleObj = imports.console;
  } else if (typeof console !== 'undefined') {
    consoleObj = console;
  }

  var method = typeof consoleObj === 'object' ? consoleObj[name] : null;

  if (method) {
    // Older IE doesn't support apply, but Chrome needs it
    if (method.apply) {
      return function() {
        method.apply(consoleObj, arguments);
      };
    } else {
      return function() {
        var message = Array.prototype.join.call(arguments, ', ');
        method(message);
      };
    }
  }
}

function assertPolyfill(test, message) {
  if (!test) {
    try {
      // attempt to preserve the stack
      throw new Error("assertion failed: " + message);
    } catch(error) {
      setTimeout(function() {
        throw error;
      }, 0);
    }
  }
}

/**
  Inside Ember-Metal, simply uses the methods from `imports.console`.
  Override this to provide more robust logging functionality.

  @class Logger
  @namespace Ember
*/
Ember.Logger = {
  /**
   Logs the arguments to the console.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.log('log value of foo:', foo); // "log value of foo: 1" will be printed to the console
    ```

   @method log
   @for Ember.Logger
   @param {*} arguments
  */
  log:   consoleMethod('log')   || Ember.K,
  /**
   Prints the arguments to the console with a warning icon.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    Ember.Logger.warn('Something happened!'); // "Something happened!" will be printed to the console with a warning icon.
    ```

   @method warn
   @for Ember.Logger
   @param {*} arguments
  */
  warn:  consoleMethod('warn')  || Ember.K,
  /**
   Prints the arguments to the console with an error icon, red text and a stack race.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    Ember.Logger.error('Danger! Danger!'); // "Danger! Danger!" will be printed to the console in red text.
    ```

   @method error
   @for Ember.Logger
   @param {*} arguments
  */
  error: consoleMethod('error') || Ember.K,
  /**
   Logs the arguments to the console.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.info('log value of foo:', foo); // "log value of foo: 1" will be printed to the console
    ```

   @method info
   @for Ember.Logger
   @param {*} arguments
  */
  info:  consoleMethod('info')  || Ember.K,
  /**
   Logs the arguments to the console in blue text.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.debug('log value of foo:', foo); // "log value of foo: 1" will be printed to the console
    ```

   @method debug
   @for Ember.Logger
   @param {*} arguments
  */
  debug: consoleMethod('debug') || consoleMethod('info') || Ember.K,
  /**

   If the value passed into Ember.Logger.assert is not truthy it will throw an error with a stack trace.

    ```javascript
    Ember.Logger.assert(true); // undefined
    Ember.Logger.assert(true === false); // Throws an Assertion failed error.
    ```

   @method assert
   @for Ember.Logger
   @param {Boolean} bool Value to test
  */
  assert: consoleMethod('assert') || assertPolyfill
};


// ..........................................................
// ERROR HANDLING
//

/**
  A function may be assigned to `Ember.onerror` to be called when Ember
  internals encounter an error. This is useful for specialized error handling
  and reporting code.

  ```javascript
  Ember.onerror = function(error) {
    Em.$.ajax('/report-error', 'POST', {
      stack: error.stack,
      otherInformation: 'whatever app state you want to provide'
    });
  };
  ```

  @event onerror
  @for Ember
  @param {Exception} error the error object
*/
Ember.onerror = null;

/**
  @private

  Wrap code block in a try/catch if `Ember.onerror` is set.

  @method handleErrors
  @for Ember
  @param {Function} func
  @param [context]
*/
Ember.handleErrors = function(func, context) {
  // Unfortunately in some browsers we lose the backtrace if we rethrow the existing error,
  // so in the event that we don't have an `onerror` handler we don't wrap in a try/catch
  if ('function' === typeof Ember.onerror) {
    try {
      return func.call(context || this);
    } catch (error) {
      Ember.onerror(error);
    }
  } else {
    return func.call(context || this);
  }
};

/**
  Merge the contents of two objects together into the first object.

  ```javascript
  Ember.merge({first: 'Tom'}, {last: 'Dale'}); // {first: 'Tom', last: 'Dale'}
  var a = {first: 'Yehuda'}, b = {last: 'Katz'};
  Ember.merge(a, b); // a == {first: 'Yehuda', last: 'Katz'}, b == {last: 'Katz'}
  ```

  @method merge
  @for Ember
  @param {Object} original The object to merge into
  @param {Object} updates The object to copy properties from
  @return {Object}
*/
Ember.merge = function(original, updates) {
  for (var prop in updates) {
    if (!updates.hasOwnProperty(prop)) { continue; }
    original[prop] = updates[prop];
  }
  return original;
};

/**
  Returns true if the passed value is null or undefined. This avoids errors
  from JSLint complaining about use of ==, which can be technically
  confusing.

  ```javascript
  Ember.isNone();              // true
  Ember.isNone(null);          // true
  Ember.isNone(undefined);     // true
  Ember.isNone('');            // false
  Ember.isNone([]);            // false
  Ember.isNone(function() {});  // false
  ```

  @method isNone
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
Ember.isNone = function(obj) {
  return obj === null || obj === undefined;
};
Ember.none = Ember.deprecateFunc("Ember.none is deprecated. Please use Ember.isNone instead.", Ember.isNone);

/**
  Verifies that a value is `null` or an empty string, empty array,
  or empty function.

  Constrains the rules on `Ember.isNone` by returning false for empty
  string and empty arrays.

  ```javascript
  Ember.isEmpty();                // true
  Ember.isEmpty(null);            // true
  Ember.isEmpty(undefined);       // true
  Ember.isEmpty('');              // true
  Ember.isEmpty([]);              // true
  Ember.isEmpty('Adam Hawkins');  // false
  Ember.isEmpty([0,1,2]);         // false
  ```

  @method isEmpty
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
Ember.isEmpty = function(obj) {
  return Ember.isNone(obj) || (obj.length === 0 && typeof obj !== 'function') || (typeof obj === 'object' && Ember.get(obj, 'length') === 0);
};
Ember.empty = Ember.deprecateFunc("Ember.empty is deprecated. Please use Ember.isEmpty instead.", Ember.isEmpty) ;


})();



(function() {
/*globals Node */
/**
@module ember-metal
*/

/**
  Platform specific methods and feature detectors needed by the framework.

  @class platform
  @namespace Ember
  @static
*/
var platform = Ember.platform = {};


/**
  Identical to `Object.create()`. Implements if not available natively.

  @method create
  @for Ember
*/
Ember.create = Object.create;

// IE8 has Object.create but it couldn't treat property descripters.
if (Ember.create) {
  if (Ember.create({a: 1}, {a: {value: 2}}).a !== 2) {
    Ember.create = null;
  }
}

// STUB_OBJECT_CREATE allows us to override other libraries that stub
// Object.create different than we would prefer
if (!Ember.create || Ember.ENV.STUB_OBJECT_CREATE) {
  var K = function() {};

  Ember.create = function(obj, props) {
    K.prototype = obj;
    obj = new K();
    if (props) {
      K.prototype = obj;
      for (var prop in props) {
        K.prototype[prop] = props[prop].value;
      }
      obj = new K();
    }
    K.prototype = null;

    return obj;
  };

  Ember.create.isSimulated = true;
}

var defineProperty = Object.defineProperty;
var canRedefineProperties, canDefinePropertyOnDOM;

// Catch IE8 where Object.defineProperty exists but only works on DOM elements
if (defineProperty) {
  try {
    defineProperty({}, 'a',{get:function() {}});
  } catch (e) {
    defineProperty = null;
  }
}

if (defineProperty) {
  // Detects a bug in Android <3.2 where you cannot redefine a property using
  // Object.defineProperty once accessors have already been set.
  canRedefineProperties = (function() {
    var obj = {};

    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: true,
      get: function() { },
      set: function() { }
    });

    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: true
    });

    return obj.a === true;
  })();

  // This is for Safari 5.0, which supports Object.defineProperty, but not
  // on DOM nodes.
  canDefinePropertyOnDOM = (function() {
    try {
      defineProperty(document.createElement('div'), 'definePropertyOnDOM', {});
      return true;
    } catch(e) { }

    return false;
  })();

  if (!canRedefineProperties) {
    defineProperty = null;
  } else if (!canDefinePropertyOnDOM) {
    defineProperty = function(obj, keyName, desc) {
      var isNode;

      if (typeof Node === "object") {
        isNode = obj instanceof Node;
      } else {
        isNode = typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName === "string";
      }

      if (isNode) {
        // TODO: Should we have a warning here?
        return (obj[keyName] = desc.value);
      } else {
        return Object.defineProperty(obj, keyName, desc);
      }
    };
  }
}

/**
@class platform
@namespace Ember
*/

/**
  Identical to `Object.defineProperty()`. Implements as much functionality
  as possible if not available natively.

  @method defineProperty
  @param {Object} obj The object to modify
  @param {String} keyName property name to modify
  @param {Object} desc descriptor hash
  @return {void}
*/
platform.defineProperty = defineProperty;

/**
  Set to true if the platform supports native getters and setters.

  @property hasPropertyAccessors
  @final
*/
platform.hasPropertyAccessors = true;

if (!platform.defineProperty) {
  platform.hasPropertyAccessors = false;

  platform.defineProperty = function(obj, keyName, desc) {
    if (!desc.get) { obj[keyName] = desc.value; }
  };

  platform.defineProperty.isSimulated = true;
}

if (Ember.ENV.MANDATORY_SETTER && !platform.hasPropertyAccessors) {
  Ember.ENV.MANDATORY_SETTER = false;
}

})();



(function() {
/*jshint newcap:false*/
/**
@module ember-metal
*/

// NOTE: There is a bug in jshint that doesn't recognize `Object()` without `new`
// as being ok unless both `newcap:false` and not `use strict`.
// https://github.com/jshint/jshint/issues/392

// Testing this is not ideal, but we want to use native functions
// if available, but not to use versions created by libraries like Prototype
var isNativeFunc = function(func) {
  // This should probably work in all browsers likely to have ES5 array methods
  return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
};

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
var arrayMap = isNativeFunc(Array.prototype.map) ? Array.prototype.map : function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null) {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") {
    throw new TypeError();
  }

  var res = new Array(len);
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) {
      res[i] = fun.call(thisp, t[i], i, t);
    }
  }

  return res;
};

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
var arrayForEach = isNativeFunc(Array.prototype.forEach) ? Array.prototype.forEach : function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null) {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") {
    throw new TypeError();
  }

  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) {
      fun.call(thisp, t[i], i, t);
    }
  }
};

var arrayIndexOf = isNativeFunc(Array.prototype.indexOf) ? Array.prototype.indexOf : function (obj, fromIndex) {
  if (fromIndex === null || fromIndex === undefined) { fromIndex = 0; }
  else if (fromIndex < 0) { fromIndex = Math.max(0, this.length + fromIndex); }
  for (var i = fromIndex, j = this.length; i < j; i++) {
    if (this[i] === obj) { return i; }
  }
  return -1;
};

/**
  Array polyfills to support ES5 features in older browsers.

  @namespace Ember
  @property ArrayPolyfills
*/
Ember.ArrayPolyfills = {
  map: arrayMap,
  forEach: arrayForEach,
  indexOf: arrayIndexOf
};

if (Ember.SHIM_ES5) {
  if (!Array.prototype.map) {
    Array.prototype.map = arrayMap;
  }

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = arrayForEach;
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = arrayIndexOf;
  }
}

})();



(function() {
/**
@module ember-metal
*/


var o_defineProperty = Ember.platform.defineProperty,
    o_create = Ember.create,
    // Used for guid generation...
    GUID_KEY = '__ember'+ (+ new Date()),
    uuid         = 0,
    numberCache  = [],
    stringCache  = {};

var MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER;

/**
  @private

  A unique key used to assign guids and other private metadata to objects.
  If you inspect an object in your browser debugger you will often see these.
  They can be safely ignored.

  On browsers that support it, these properties are added with enumeration
  disabled so they won't show up when you iterate over your properties.

  @property GUID_KEY
  @for Ember
  @type String
  @final
*/
Ember.GUID_KEY = GUID_KEY;

var GUID_DESC = {
  writable:    false,
  configurable: false,
  enumerable:  false,
  value: null
};

/**
  @private

  Generates a new guid, optionally saving the guid to the object that you
  pass in. You will rarely need to use this method. Instead you should
  call `Ember.guidFor(obj)`, which return an existing guid if available.

  @method generateGuid
  @for Ember
  @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
    be saved on the object and reused whenever you pass the same object
    again.

    If no object is passed, just generate a new guid.
  @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
    separate the guid into separate namespaces.
  @return {String} the guid
*/
Ember.generateGuid = function generateGuid(obj, prefix) {
  if (!prefix) prefix = 'ember';
  var ret = (prefix + (uuid++));
  if (obj) {
    GUID_DESC.value = ret;
    o_defineProperty(obj, GUID_KEY, GUID_DESC);
  }
  return ret ;
};

/**
  @private

  Returns a unique id for the object. If the object does not yet have a guid,
  one will be assigned to it. You can call this on any object,
  `Ember.Object`-based or not, but be aware that it will add a `_guid`
  property.

  You can also use this method on DOM Element objects.

  @method guidFor
  @for Ember
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
Ember.guidFor = function guidFor(obj) {

  // special cases where we don't want to add a key to object
  if (obj === undefined) return "(undefined)";
  if (obj === null) return "(null)";

  var ret;
  var type = typeof obj;

  // Don't allow prototype changes to String etc. to change the guidFor
  switch(type) {
    case 'number':
      ret = numberCache[obj];
      if (!ret) ret = numberCache[obj] = 'nu'+obj;
      return ret;

    case 'string':
      ret = stringCache[obj];
      if (!ret) ret = stringCache[obj] = 'st'+(uuid++);
      return ret;

    case 'boolean':
      return obj ? '(true)' : '(false)';

    default:
      if (obj[GUID_KEY]) return obj[GUID_KEY];
      if (obj === Object) return '(Object)';
      if (obj === Array)  return '(Array)';
      ret = 'ember'+(uuid++);
      GUID_DESC.value = ret;
      o_defineProperty(obj, GUID_KEY, GUID_DESC);
      return ret;
  }
};

// ..........................................................
// META
//

var META_DESC = {
  writable:    true,
  configurable: false,
  enumerable:  false,
  value: null
};

var META_KEY = Ember.GUID_KEY+'_meta';

/**
  The key used to store meta information on object for property observing.

  @property META_KEY
  @for Ember
  @private
  @final
  @type String
*/
Ember.META_KEY = META_KEY;

// Placeholder for non-writable metas.
var EMPTY_META = {
  descs: {},
  watching: {}
};

if (MANDATORY_SETTER) { EMPTY_META.values = {}; }

Ember.EMPTY_META = EMPTY_META;

if (Object.freeze) Object.freeze(EMPTY_META);

var isDefinePropertySimulated = Ember.platform.defineProperty.isSimulated;

function Meta(obj) {
  this.descs = {};
  this.watching = {};
  this.cache = {};
  this.source = obj;
}

if (isDefinePropertySimulated) {
  // on platforms that don't support enumerable false
  // make meta fail jQuery.isPlainObject() to hide from
  // jQuery.extend() by having a property that fails
  // hasOwnProperty check.
  Meta.prototype.__preventPlainObject__ = true;

  // Without non-enumerable properties, meta objects will be output in JSON
  // unless explicitly suppressed
  Meta.prototype.toJSON = function () { };
}

/**
  Retrieves the meta hash for an object. If `writable` is true ensures the
  hash is writable for this object as well.

  The meta object contains information about computed property descriptors as
  well as any watched properties and other information. You generally will
  not access this information directly but instead work with higher level
  methods that manipulate this hash indirectly.

  @method meta
  @for Ember
  @private

  @param {Object} obj The object to retrieve meta for
  @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
    the meta hash, allowing the method to avoid making an unnecessary copy.
  @return {Object} the meta hash for an object
*/
Ember.meta = function meta(obj, writable) {

  var ret = obj[META_KEY];
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    if (!isDefinePropertySimulated) o_defineProperty(obj, META_KEY, META_DESC);

    ret = new Meta(obj);

    if (MANDATORY_SETTER) { ret.values = {}; }

    obj[META_KEY] = ret;

    // make sure we don't accidentally try to create constructor like desc
    ret.descs.constructor = null;

  } else if (ret.source !== obj) {
    if (!isDefinePropertySimulated) o_defineProperty(obj, META_KEY, META_DESC);

    ret = o_create(ret);
    ret.descs    = o_create(ret.descs);
    ret.watching = o_create(ret.watching);
    ret.cache    = {};
    ret.source   = obj;

    if (MANDATORY_SETTER) { ret.values = o_create(ret.values); }

    obj[META_KEY] = ret;
  }
  return ret;
};

Ember.getMeta = function getMeta(obj, property) {
  var meta = Ember.meta(obj, false);
  return meta[property];
};

Ember.setMeta = function setMeta(obj, property, value) {
  var meta = Ember.meta(obj, true);
  meta[property] = value;
  return value;
};

/**
  @deprecated
  @private

  In order to store defaults for a class, a prototype may need to create
  a default meta object, which will be inherited by any objects instantiated
  from the class's constructor.

  However, the properties of that meta object are only shallow-cloned,
  so if a property is a hash (like the event system's `listeners` hash),
  it will by default be shared across all instances of that class.

  This method allows extensions to deeply clone a series of nested hashes or
  other complex objects. For instance, the event system might pass
  `['listeners', 'foo:change', 'ember157']` to `prepareMetaPath`, which will
  walk down the keys provided.

  For each key, if the key does not exist, it is created. If it already
  exists and it was inherited from its constructor, the constructor's
  key is cloned.

  You can also pass false for `writable`, which will simply return
  undefined if `prepareMetaPath` discovers any part of the path that
  shared or undefined.

  @method metaPath
  @for Ember
  @param {Object} obj The object whose meta we are examining
  @param {Array} path An array of keys to walk down
  @param {Boolean} writable whether or not to create a new meta
    (or meta property) if one does not already exist or if it's
    shared with its constructor
*/
Ember.metaPath = function metaPath(obj, path, writable) {

  var meta = Ember.meta(obj, writable), keyName, value;

  for (var i=0, l=path.length; i<l; i++) {
    keyName = path[i];
    value = meta[keyName];

    if (!value) {
      if (!writable) { return undefined; }
      value = meta[keyName] = { __ember_source__: obj };
    } else if (value.__ember_source__ !== obj) {
      if (!writable) { return undefined; }
      value = meta[keyName] = o_create(value);
      value.__ember_source__ = obj;
    }

    meta = value;
  }

  return value;
};

/**
  @private

  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked. This is the primitive we use to implement
  calls to super.

  @method wrap
  @for Ember
  @param {Function} func The function to call
  @param {Function} superFunc The super function.
  @return {Function} wrapped function.
*/
Ember.wrap = function(func, superFunc) {
  function K() {}

  function superWrapper() {
    var ret, sup = this._super;
    this._super = superFunc || K;
    ret = func.apply(this, arguments);
    this._super = sup;
    return ret;
  }

  superWrapper.wrappedFunction = func;
  superWrapper.__ember_observes__ = func.__ember_observes__;
  superWrapper.__ember_observesBefore__ = func.__ember_observesBefore__;
  superWrapper.__ember_listens__ = func.__ember_listens__;

  return superWrapper;
};

/**
  Returns true if the passed object is an array or Array-like.

  Ember Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike `Ember.typeOf` this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements `Ember.Array`)

  ```javascript
  Ember.isArray();                                            // false
  Ember.isArray([]);                                          // true
  Ember.isArray( Ember.ArrayProxy.create({ content: [] }) );  // true
  ```

  @method isArray
  @for Ember
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
*/
Ember.isArray = function(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if (Ember.Array && Ember.Array.detect(obj)) { return true; }
  if ((obj.length !== undefined) && 'object'===typeof obj) { return true; }
  return false;
};

/**
  Forces the passed object to be part of an array. If the object is already
  an array or array-like, returns the object. Otherwise adds the object to
  an array. If obj is `null` or `undefined`, returns an empty array.

  ```javascript
  Ember.makeArray();                           // []
  Ember.makeArray(null);                       // []
  Ember.makeArray(undefined);                  // []
  Ember.makeArray('lindsay');                  // ['lindsay']
  Ember.makeArray([1,2,42]);                   // [1,2,42]

  var controller = Ember.ArrayProxy.create({ content: [] });
  Ember.makeArray(controller) === controller;  // true
  ```

  @method makeArray
  @for Ember
  @param {Object} obj the object
  @return {Array}
*/
Ember.makeArray = function(obj) {
  if (obj === null || obj === undefined) { return []; }
  return Ember.isArray(obj) ? obj : [obj];
};

function canInvoke(obj, methodName) {
  return !!(obj && typeof obj[methodName] === 'function');
}

/**
  Checks to see if the `methodName` exists on the `obj`.

  ```javascript
  var foo = {bar: Ember.K, baz: null};
  Ember.canInvoke(foo, 'bar'); // true
  Ember.canInvoke(foo, 'baz'); // false
  Ember.canInvoke(foo, 'bat'); // false
  ```

  @method canInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @return {Boolean}
*/
Ember.canInvoke = canInvoke;

/**
  Checks to see if the `methodName` exists on the `obj`,
  and if it does, invokes it with the arguments passed.

  ```javascript
  var d = new Date('03/15/2013');
  Ember.tryInvoke(d, 'getTime'); // 1363320000000
  Ember.tryInvoke(d, 'setFullYear', [2014]); // 1394856000000
  Ember.tryInvoke(d, 'noSuchMethod', [2014]); // undefined
  ```

  @method tryInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @param {Array} [args] The arguments to pass to the method
  @return {*} the return value of the invoked method or undefined if it cannot be invoked
*/
Ember.tryInvoke = function(obj, methodName, args) {
  if (canInvoke(obj, methodName)) {
    return obj[methodName].apply(obj, args || []);
  }
};

// https://github.com/emberjs/ember.js/pull/1617
var needsFinallyFix = (function() {
  var count = 0;
  try{
    try { }
    finally {
      count++;
      throw new Error('needsFinallyFixTest');
    }
  } catch (e) {}

  return count !== 1;
})();

/**
  Provides try { } finally { } functionality, while working
  around Safari's double finally bug.

  ```javascript
  var tryable = function() {
    someResource.lock();
    runCallback(); // May throw error.
  };
  var finalizer = function() {
    someResource.unlock();
  };
  Ember.tryFinally(tryable, finalizer);
  ```

  @method tryFinally
  @for Ember
  @param {Function} tryable The function to run the try callback
  @param {Function} finalizer The function to run the finally callback
  @param {Object} [binding] The optional calling object. Defaults to 'this'
  @return {*} The return value is the that of the finalizer,
  unless that value is undefined, in which case it is the return value
  of the tryable
*/

if (needsFinallyFix) {
  Ember.tryFinally = function(tryable, finalizer, binding) {
    var result, finalResult, finalError;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } finally {
      try {
        finalResult = finalizer.call(binding);
      } catch (e) {
        finalError = e;
      }
    }

    if (finalError) { throw finalError; }

    return (finalResult === undefined) ? result : finalResult;
  };
} else {
  Ember.tryFinally = function(tryable, finalizer, binding) {
    var result, finalResult;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } finally {
      finalResult = finalizer.call(binding);
    }

    return (finalResult === undefined) ? result : finalResult;
  };
}

/**
  Provides try { } catch finally { } functionality, while working
  around Safari's double finally bug.

  ```javascript
  var tryable = function() {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      beforeValues[i] = listener.before(name, time(), payload);
    }

    return callback.call(binding);
  };

  var catchable = function(e) {
    payload = payload || {};
    payload.exception = e;
  };

  var finalizer = function() {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      listener.after(name, time(), payload, beforeValues[i]);
    }
  };
  Ember.tryCatchFinally(tryable, catchable, finalizer);
  ```

  @method tryCatchFinally
  @for Ember
  @param {Function} tryable The function to run the try callback
  @param {Function} catchable The function to run the catchable callback
  @param {Function} finalizer The function to run the finally callback
  @param {Object} [binding] The optional calling object. Defaults to 'this'
  @return {*} The return value is the that of the finalizer,
  unless that value is undefined, in which case it is the return value
  of the tryable.
*/
if (needsFinallyFix) {
  Ember.tryCatchFinally = function(tryable, catchable, finalizer, binding) {
    var result, finalResult, finalError;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } catch(error) {
      result = catchable.call(binding, error);
    } finally {
      try {
        finalResult = finalizer.call(binding);
      } catch (e) {
        finalError = e;
      }
    }

    if (finalError) { throw finalError; }

    return (finalResult === undefined) ? result : finalResult;
  };
} else {
  Ember.tryCatchFinally = function(tryable, catchable, finalizer, binding) {
    var result, finalResult;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } catch(error) {
      result = catchable.call(binding, error);
    } finally {
      finalResult = finalizer.call(binding);
    }

    return (finalResult === undefined) ? result : finalResult;
  };
}

// ........................................
// TYPING & ARRAY MESSAGING
//

var TYPE_MAP = {};
var t = "Boolean Number String Function Array Date RegExp Object".split(" ");
Ember.ArrayPolyfills.forEach.call(t, function(name) {
  TYPE_MAP[ "[object " + name + "]" ] = name.toLowerCase();
});

var toString = Object.prototype.toString;

/**
  Returns a consistent type for the passed item.

  Use this instead of the built-in `typeof` to get the type of an item.
  It will return the same result across all browsers and includes a bit
  more detail. Here is what will be returned:

      | Return Value  | Meaning                                              |
      |---------------|------------------------------------------------------|
      | 'string'      | String primitive                                     |
      | 'number'      | Number primitive                                     |
      | 'boolean'     | Boolean primitive                                    |
      | 'null'        | Null value                                           |
      | 'undefined'   | Undefined value                                      |
      | 'function'    | A function                                           |
      | 'array'       | An instance of Array                                 |
      | 'class'       | An Ember class (created using Ember.Object.extend()) |
      | 'instance'    | An Ember object instance                             |
      | 'error'       | An instance of the Error object                      |
      | 'object'      | A JavaScript object not inheriting from Ember.Object |

  Examples:

  ```javascript
  Ember.typeOf();                       // 'undefined'
  Ember.typeOf(null);                   // 'null'
  Ember.typeOf(undefined);              // 'undefined'
  Ember.typeOf('michael');              // 'string'
  Ember.typeOf(101);                    // 'number'
  Ember.typeOf(true);                   // 'boolean'
  Ember.typeOf(Ember.makeArray);        // 'function'
  Ember.typeOf([1,2,90]);               // 'array'
  Ember.typeOf(Ember.Object.extend());  // 'class'
  Ember.typeOf(Ember.Object.create());  // 'instance'
  Ember.typeOf(new Error('teamocil'));  // 'error'

  // "normal" JavaScript object
  Ember.typeOf({a: 'b'});              // 'object'
  ```

  @method typeOf
  @for Ember
  @param {Object} item the item to check
  @return {String} the type
*/
Ember.typeOf = function(item) {
  var ret;

  ret = (item === null || item === undefined) ? String(item) : TYPE_MAP[toString.call(item)] || 'object';

  if (ret === 'function') {
    if (Ember.Object && Ember.Object.detect(item)) ret = 'class';
  } else if (ret === 'object') {
    if (item instanceof Error) ret = 'error';
    else if (Ember.Object && item instanceof Ember.Object) ret = 'instance';
    else ret = 'object';
  }

  return ret;
};

})();



(function() {
// Ember.tryCatchFinally

/**
  The purpose of the Ember Instrumentation module is
  to provide efficient, general-purpose instrumentation
  for Ember.

  Subscribe to a listener by using `Ember.subscribe`:

  ```javascript
  Ember.subscribe("render", {
    before: function(name, timestamp, payload) {

    },

    after: function(name, timestamp, payload) {

    }
  });
  ```

  If you return a value from the `before` callback, that same
  value will be passed as a fourth parameter to the `after`
  callback.

  Instrument a block of code by using `Ember.instrument`:

  ```javascript
  Ember.instrument("render.handlebars", payload, function() {
    // rendering logic
  }, binding);
  ```

  Event names passed to `Ember.instrument` are namespaced
  by periods, from more general to more specific. Subscribers
  can listen for events by whatever level of granularity they
  are interested in.

  In the above example, the event is `render.handlebars`,
  and the subscriber listened for all events beginning with
  `render`. It would receive callbacks for events named
  `render`, `render.handlebars`, `render.container`, or
  even `render.handlebars.layout`.

  @class Instrumentation
  @namespace Ember
  @static
*/
Ember.Instrumentation = {};

var subscribers = [], cache = {};

var populateListeners = function(name) {
  var listeners = [], subscriber;

  for (var i=0, l=subscribers.length; i<l; i++) {
    subscriber = subscribers[i];
    if (subscriber.regex.test(name)) {
      listeners.push(subscriber.object);
    }
  }

  cache[name] = listeners;
  return listeners;
};

var time = (function() {
  var perf = 'undefined' !== typeof window ? window.performance || {} : {};
  var fn = perf.now || perf.mozNow || perf.webkitNow || perf.msNow || perf.oNow;
  // fn.bind will be available in all the browsers that support the advanced window.performance... ;-)
  return fn ? fn.bind(perf) : function() { return +new Date(); };
})();

/**
  Notifies event's subscribers, calls `before` and `after` hooks.

  @method instrument
  @namespace Ember.Instrumentation

  @param {String} [name] Namespaced event name.
  @param {Object} payload
  @param {Function} callback Function that you're instrumenting.
  @param {Object} binding Context that instrument function is called with.
*/
Ember.Instrumentation.instrument = function(name, payload, callback, binding) {
  var listeners = cache[name], timeName, ret;

  if (Ember.STRUCTURED_PROFILE) {
    timeName = name + ": " + payload.object;
    console.time(timeName);
  }

  if (!listeners) {
    listeners = populateListeners(name);
  }

  if (listeners.length === 0) {
    ret = callback.call(binding);
    if (Ember.STRUCTURED_PROFILE) { console.timeEnd(timeName); }
    return ret;
  }

  var beforeValues = [], listener, i, l;

  function tryable() {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      beforeValues[i] = listener.before(name, time(), payload);
    }

    return callback.call(binding);
  }

  function catchable(e) {
    payload = payload || {};
    payload.exception = e;
  }

  function finalizer() {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      listener.after(name, time(), payload, beforeValues[i]);
    }

    if (Ember.STRUCTURED_PROFILE) {
      console.timeEnd(timeName);
    }
  }

  return Ember.tryCatchFinally(tryable, catchable, finalizer);
};

/**
  Subscribes to a particular event or instrumented block of code.

  @method subscribe
  @namespace Ember.Instrumentation

  @param {String} [pattern] Namespaced event name.
  @param {Object} [object] Before and After hooks.
*/
Ember.Instrumentation.subscribe = function(pattern, object) {
  var paths = pattern.split("."), path, regex = [];

  for (var i=0, l=paths.length; i<l; i++) {
    path = paths[i];
    if (path === "*") {
      regex.push("[^\\.]*");
    } else {
      regex.push(path);
    }
  }

  regex = regex.join("\\.");
  regex = regex + "(\\..*)?";

  var subscriber = {
    pattern: pattern,
    regex: new RegExp("^" + regex + "$"),
    object: object
  };

  subscribers.push(subscriber);
  cache = {};

  return subscriber;
};

/**
  Unsubscribes from a particular event or instrumented block of code.

  @method unsubscribe
  @namespace Ember.Instrumentation

  @param {Object} [subscriber]
*/
Ember.Instrumentation.unsubscribe = function(subscriber) {
  var index;

  for (var i=0, l=subscribers.length; i<l; i++) {
    if (subscribers[i] === subscriber) {
      index = i;
    }
  }

  subscribers.splice(index, 1);
  cache = {};
};

/**
  Resets `Ember.Instrumentation` by flushing list of subscribers.

  @method reset
  @namespace Ember.Instrumentation
*/
Ember.Instrumentation.reset = function() {
  subscribers = [];
  cache = {};
};

Ember.instrument = Ember.Instrumentation.instrument;
Ember.subscribe = Ember.Instrumentation.subscribe;
})();



(function() {
var map, forEach, indexOf, splice;
map     = Array.prototype.map     || Ember.ArrayPolyfills.map;
forEach = Array.prototype.forEach || Ember.ArrayPolyfills.forEach;
indexOf = Array.prototype.indexOf || Ember.ArrayPolyfills.indexOf;
splice = Array.prototype.splice;

var utils = Ember.EnumerableUtils = {
  map: function(obj, callback, thisArg) {
    return obj.map ? obj.map.call(obj, callback, thisArg) : map.call(obj, callback, thisArg);
  },

  forEach: function(obj, callback, thisArg) {
    return obj.forEach ? obj.forEach.call(obj, callback, thisArg) : forEach.call(obj, callback, thisArg);
  },

  indexOf: function(obj, element, index) {
    return obj.indexOf ? obj.indexOf.call(obj, element, index) : indexOf.call(obj, element, index);
  },

  indexesOf: function(obj, elements) {
    return elements === undefined ? [] : utils.map(elements, function(item) {
      return utils.indexOf(obj, item);
    });
  },

  addObject: function(array, item) {
    var index = utils.indexOf(array, item);
    if (index === -1) { array.push(item); }
  },

  removeObject: function(array, item) {
    var index = utils.indexOf(array, item);
    if (index !== -1) { array.splice(index, 1); }
  },

  _replace: function(array, idx, amt, objects) {
    var args = [].concat(objects), chunk, ret = [],
        // https://code.google.com/p/chromium/issues/detail?id=56588
        size = 60000, start = idx, ends = amt, count;

    while (args.length) {
      count = ends > size ? size : ends;
      if (count <= 0) { count = 0; }

      chunk = args.splice(0, size);
      chunk = [start, count].concat(chunk);

      start += size;
      ends -= count;

      ret = ret.concat(splice.apply(array, chunk));
    }
    return ret;
  },

  replace: function(array, idx, amt, objects) {
    if (array.replace) {
      return array.replace(idx, amt, objects);
    } else {
      return utils._replace(array, idx, amt, objects);
    }
  },

  intersection: function(array1, array2) {
    var intersection = [];

    utils.forEach(array1, function(element) {
      if (utils.indexOf(array2, element) >= 0) {
        intersection.push(element);
      }
    });

    return intersection;
  }
};

})();



(function() {
/**
@module ember-metal
*/

var META_KEY = Ember.META_KEY, get;

var MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER;

var IS_GLOBAL_PATH = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]/;
var HAS_THIS  = /^this[\.\*]/;
var FIRST_KEY = /^([^\.\*]+)/;

// ..........................................................
// GET AND SET
//
// If we are on a platform that supports accessors we can use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

/**
  Gets the value of a property on an object. If the property is computed,
  the function will be invoked. If the property is not defined but the
  object implements the `unknownProperty` method then that will be invoked.

  If you plan to run on IE8 and older browsers then you should use this
  method anytime you want to retrieve a property on an object that you don't
  know for sure is private. (Properties beginning with an underscore '_'
  are considered private.)

  On all newer browsers, you only need to use this method to retrieve
  properties if the property might not be defined on the object and you want
  to respect the `unknownProperty` handler. Otherwise you can ignore this
  method.

  Note that if the object itself is `undefined`, this method will throw
  an error.

  @method get
  @for Ember
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The property key to retrieve
  @return {Object} the property value or `null`.
*/
get = function get(obj, keyName) {
  // Helpers that operate with 'this' within an #each
  if (keyName === '') {
    return obj;
  }

  if (!keyName && 'string'===typeof obj) {
    keyName = obj;
    obj = null;
  }



  if (obj === null || keyName.indexOf('.') !== -1) {
    return getPath(obj, keyName);
  }

  var meta = obj[META_KEY], desc = meta && meta.descs[keyName], ret;
  if (desc) {
    return desc.get(obj, keyName);
  } else {
    if (MANDATORY_SETTER && meta && meta.watching[keyName] > 0) {
      ret = meta.values[keyName];
    } else {
      ret = obj[keyName];
    }

    if (ret === undefined &&
        'object' === typeof obj && !(keyName in obj) && 'function' === typeof obj.unknownProperty) {
      return obj.unknownProperty(keyName);
    }

    return ret;
  }
};

// Currently used only by Ember Data tests
if (Ember.config.overrideAccessors) {
  Ember.get = get;
  Ember.config.overrideAccessors();
  get = Ember.get;
}

/**
  @private

  Normalizes a target/path pair to reflect that actual target/path that should
  be observed, etc. This takes into account passing in global property
  paths (i.e. a path beginning with a captial letter not defined on the
  target) and * separators.

  @method normalizeTuple
  @for Ember
  @param {Object} target The current target. May be `null`.
  @param {String} path A path on the target or a global property path.
  @return {Array} a temporary array with the normalized target/path pair.
*/
var normalizeTuple = Ember.normalizeTuple = function(target, path) {
  var hasThis  = HAS_THIS.test(path),
      isGlobal = !hasThis && IS_GLOBAL_PATH.test(path),
      key;

  if (!target || isGlobal) target = Ember.lookup;
  if (hasThis) path = path.slice(5);

  if (target === Ember.lookup) {
    key = path.match(FIRST_KEY)[0];
    target = get(target, key);
    path   = path.slice(key.length+1);
  }

  // must return some kind of path to be valid else other things will break.
  if (!path || path.length===0) throw new Error('Invalid Path');

  return [ target, path ];
};

var getPath = Ember._getPath = function(root, path) {
  var hasThis, parts, tuple, idx, len;

  // If there is no root and path is a key name, return that
  // property from the global object.
  // E.g. get('Ember') -> Ember
  if (root === null && path.indexOf('.') === -1) { return get(Ember.lookup, path); }

  // detect complicated paths and normalize them
  hasThis  = HAS_THIS.test(path);

  if (!root || hasThis) {
    tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
    tuple.length = 0;
  }

  parts = path.split(".");
  len = parts.length;
  for (idx = 0; root != null && idx < len; idx++) {
    root = get(root, parts[idx], true);
    if (root && root.isDestroyed) { return undefined; }
  }
  return root;
};

Ember.getWithDefault = function(root, key, defaultValue) {
  var value = get(root, key);

  if (value === undefined) { return defaultValue; }
  return value;
};


Ember.get = get;
Ember.getPath = Ember.deprecateFunc('getPath is deprecated since get now supports paths', Ember.get);

})();



(function() {
/**
@module ember-metal
*/

var o_create = Ember.create,
    metaFor = Ember.meta,
    META_KEY = Ember.META_KEY,
    a_slice = [].slice,
    /* listener flags */
    ONCE = 1, SUSPENDED = 2;

/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:changed": [ // variable name: `actions`
            target, method, flags
          ]
        }
      }

*/

function indexOf(array, target, method) {
  var index = -1;
  for (var i = 0, l = array.length; i < l; i += 3) {
    if (target === array[i] && method === array[i+1]) { index = i; break; }
  }
  return index;
}

function actionsFor(obj, eventName) {
  var meta = metaFor(obj, true),
      actions;

  if (!meta.listeners) { meta.listeners = {}; }

  if (!meta.hasOwnProperty('listeners')) {
    // setup inherited copy of the listeners object
    meta.listeners = o_create(meta.listeners);
  }

  actions = meta.listeners[eventName];

  // if there are actions, but the eventName doesn't exist in our listeners, then copy them from the prototype
  if (actions && !meta.listeners.hasOwnProperty(eventName)) {
    actions = meta.listeners[eventName] = meta.listeners[eventName].slice();
  } else if (!actions) {
    actions = meta.listeners[eventName] = [];
  }

  return actions;
}

function actionsUnion(obj, eventName, otherActions) {
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName];

  if (!actions) { return; }
  for (var i = actions.length - 3; i >= 0; i -= 3) {
    var target = actions[i],
        method = actions[i+1],
        flags = actions[i+2],
        actionIndex = indexOf(otherActions, target, method);

    if (actionIndex === -1) {
      otherActions.push(target, method, flags);
    }
  }
}

function actionsDiff(obj, eventName, otherActions) {
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName],
      diffActions = [];

  if (!actions) { return; }
  for (var i = actions.length - 3; i >= 0; i -= 3) {
    var target = actions[i],
        method = actions[i+1],
        flags = actions[i+2],
        actionIndex = indexOf(otherActions, target, method);

    if (actionIndex !== -1) { continue; }

    otherActions.push(target, method, flags);
    diffActions.push(target, method, flags);
  }

  return diffActions;
}

/**
  Add an event listener

  @method addListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Boolean} once A flag whether a function should only be called once
*/
function addListener(obj, eventName, target, method, once) {


  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName),
      actionIndex = indexOf(actions, target, method),
      flags = 0;

  if (once) flags |= ONCE;

  if (actionIndex !== -1) { return; }

  actions.push(target, method, flags);

  if ('function' === typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
}

/**
  Remove an event listener

  Arguments should match those passed to `Ember.addListener`.

  @method removeListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
*/
function removeListener(obj, eventName, target, method) {


  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  function _removeListener(target, method) {
    var actions = actionsFor(obj, eventName),
        actionIndex = indexOf(actions, target, method);

    // action doesn't exist, give up silently
    if (actionIndex === -1) { return; }

    actions.splice(actionIndex, 3);

    if ('function' === typeof obj.didRemoveListener) {
      obj.didRemoveListener(eventName, target, method);
    }
  }

  if (method) {
    _removeListener(target, method);
  } else {
    var meta = obj[META_KEY],
        actions = meta && meta.listeners && meta.listeners[eventName];

    if (!actions) { return; }
    for (var i = actions.length - 3; i >= 0; i -= 3) {
      _removeListener(actions[i], actions[i+1]);
    }
  }
}

/**
  @private

  Suspend listener during callback.

  This should only be used by the target of the event listener
  when it is taking an action that would cause the event, e.g.
  an object might suspend its property change listener while it is
  setting that property.

  @method suspendListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
function suspendListener(obj, eventName, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName),
      actionIndex = indexOf(actions, target, method);

  if (actionIndex !== -1) {
    actions[actionIndex+2] |= SUSPENDED; // mark the action as suspended
  }

  function tryable()   { return callback.call(target); }
  function finalizer() { if (actionIndex !== -1) { actions[actionIndex+2] &= ~SUSPENDED; } }

  return Ember.tryFinally(tryable, finalizer);
}

/**
  @private

  Suspends multiple listeners during a callback.

  
  @method suspendListeners
  @for Ember
  @param obj
  @param {Array} eventName Array of event names
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
function suspendListeners(obj, eventNames, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var suspendedActions = [],
      actionsList = [],
      eventName, actions, i, l;

  for (i=0, l=eventNames.length; i<l; i++) {
    eventName = eventNames[i];
    actions = actionsFor(obj, eventName);
    var actionIndex = indexOf(actions, target, method);

    if (actionIndex !== -1) {
      actions[actionIndex+2] |= SUSPENDED;
      suspendedActions.push(actionIndex);
      actionsList.push(actions);
    }
  }

  function tryable() { return callback.call(target); }

  function finalizer() {
    for (var i = 0, l = suspendedActions.length; i < l; i++) {
      var actionIndex = suspendedActions[i];
      actionsList[i][actionIndex+2] &= ~SUSPENDED;
    }
  }

  return Ember.tryFinally(tryable, finalizer);
}

/**
  @private

  Return a list of currently watched events

  @method watchedEvents
  @for Ember
  @param obj
*/
function watchedEvents(obj) {
  var listeners = obj[META_KEY].listeners, ret = [];

  if (listeners) {
    for(var eventName in listeners) {
      if (listeners[eventName]) { ret.push(eventName); }
    }
  }
  return ret;
}

/**
  Send an event. The execution of suspended listeners
  is skipped, and once listeners are removed. A listener without
  a target is executed on the passed object. If an array of actions
  is not passed, the actions stored on the passed object are invoked.
  
  @method sendEvent
  @for Ember
  @param obj
  @param {String} eventName
  @param {Array} params Optional parameters for each listener.
  @param {Array} actions Optional array of actions (listeners).
  @return true
*/
function sendEvent(obj, eventName, params, actions) {
  // first give object a chance to handle it
  if (obj !== Ember && 'function' === typeof obj.sendEvent) {
    obj.sendEvent(eventName, params);
  }

  if (!actions) {
    var meta = obj[META_KEY];
    actions = meta && meta.listeners && meta.listeners[eventName];
  }

  if (!actions) { return; }

  for (var i = actions.length - 3; i >= 0; i -= 3) { // looping in reverse for once listeners
    var target = actions[i], method = actions[i+1], flags = actions[i+2];
    if (!method) { continue; }
    if (flags & SUSPENDED) { continue; }
    if (flags & ONCE) { removeListener(obj, eventName, target, method); }
    if (!target) { target = obj; }
    if ('string' === typeof method) { method = target[method]; }
    if (params) {
      method.apply(target, params);
    } else {
      method.call(target);
    }
  }
  return true;
}

/**
  @private
  @method hasListeners
  @for Ember
  @param obj
  @param {String} eventName
*/
function hasListeners(obj, eventName) {
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName];

  return !!(actions && actions.length);
}

/**
  @private
  @method listenersFor
  @for Ember
  @param obj
  @param {String} eventName
*/
function listenersFor(obj, eventName) {
  var ret = [];
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName];

  if (!actions) { return ret; }

  for (var i = 0, l = actions.length; i < l; i += 3) {
    var target = actions[i],
        method = actions[i+1];
    ret.push([target, method]);
  }

  return ret;
}

/**
  Define a property as a function that should be executed when
  a specified event or events are triggered.

      var Job = Ember.Object.extend({
        logCompleted: Ember.on('completed', function(){
          console.log('Job completed!');
        })
      });
      var job = Job.create();
      Ember.sendEvent(job, 'completed'); // Logs "Job completed!"

  @method on
  @for Ember
  @param {String} eventNames*
  @param {Function} func
  @return func
*/
Ember.on = function(){
  var func = a_slice.call(arguments, -1)[0],
      events = a_slice.call(arguments, 0, -1);
  func.__ember_listens__ = events;
  return func;
};

Ember.addListener = addListener;
Ember.removeListener = removeListener;
Ember._suspendListener = suspendListener;
Ember._suspendListeners = suspendListeners;
Ember.sendEvent = sendEvent;
Ember.hasListeners = hasListeners;
Ember.watchedEvents = watchedEvents;
Ember.listenersFor = listenersFor;
Ember.listenersDiff = actionsDiff;
Ember.listenersUnion = actionsUnion;

})();



(function() {
var guidFor = Ember.guidFor,
    sendEvent = Ember.sendEvent;

/*
  this.observerSet = {
    [senderGuid]: { // variable name: `keySet`
      [keyName]: listIndex
    }
  },
  this.observers = [
    {
      sender: obj,
      keyName: keyName,
      eventName: eventName,
      listeners: [
        [target, method, flags]
      ]
    },
    ...
  ]
*/
var ObserverSet = Ember._ObserverSet = function() {
  this.clear();
};

ObserverSet.prototype.add = function(sender, keyName, eventName) {
  var observerSet = this.observerSet,
      observers = this.observers,
      senderGuid = guidFor(sender),
      keySet = observerSet[senderGuid],
      index;

  if (!keySet) {
    observerSet[senderGuid] = keySet = {};
  }
  index = keySet[keyName];
  if (index === undefined) {
    index = observers.push({
      sender: sender,
      keyName: keyName,
      eventName: eventName,
      listeners: []
    }) - 1;
    keySet[keyName] = index;
  }
  return observers[index].listeners;
};

ObserverSet.prototype.flush = function() {
  var observers = this.observers, i, len, observer, sender;
  this.clear();
  for (i=0, len