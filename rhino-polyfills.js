// Rhino-compatible polyfills for APIs missing or broken in ServiceNow's Rhino engine.
// These are injected inside the IIFE by esbuild's `inject` option, so they
// don't touch the sealed global scope — they're just local variables in the bundle.

// Object.fromEntries
if (
  !Object.fromEntries ||
  (function () {
    try {
      return Object.fromEntries([["a", 1]]).a !== 1;
    } catch (e) {
      return true;
    }
  })()
) {
  Object.fromEntries = function (entries) {
    var obj = {};
    for (var i = 0; i < entries.length; i++) {
      obj[entries[i][0]] = entries[i][1];
    }
    return obj;
  };
}

// Object.values
if (
  !Object.values ||
  (function () {
    try {
      return Object.values({ a: 1 })[0] !== 1;
    } catch (e) {
      return true;
    }
  })()
) {
  Object.values = function (obj) {
    var vals = [];
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        vals.push(obj[key]);
      }
    }
    return vals;
  };
}

// Object.entries
if (
  !Object.entries ||
  (function () {
    try {
      return Object.entries({ a: 1 })[0][0] !== "a";
    } catch (e) {
      return true;
    }
  })()
) {
  Object.entries = function (obj) {
    var entries = [];
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        entries.push([key, obj[key]]);
      }
    }
    return entries;
  };
}

// URL - minimal implementation sufficient for Zod's URL format validation
if (typeof URL === "undefined") {
  URL = function (str) {
    var match = str.match(
      /^(https?):\/\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/,
    );
    if (!match) throw new TypeError("Invalid URL: " + str);
    this.protocol = match[1] + ":";
    this.hostname = match[2].split(":")[0];
    this.port = match[2].split(":")[1] || "";
    this.pathname = match[3] || "/";
    this.search = match[4] || "";
    this.hash = match[5] || "";
    this.host = match[2];
    this.href = str;
    this.origin = match[1] + "://" + match[2];
  };
}
