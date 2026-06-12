var __G =
  typeof global !== "undefined"
    ? global
    : typeof globalThis !== "undefined"
      ? globalThis
      : this;

// ── Symbol (string-token shim; aligns with the bundle's "@@iterator" fallbacks)
var Symbol =
  __G && __G.Symbol
    ? __G.Symbol
    : (function () {
        var n = 0;
        function S(desc) {
          return "@@" + (desc === undefined ? "sym" : desc) + "_" + ++n;
        }
        S.iterator = "@@iterator";
        S.asyncIterator = "@@asyncIterator";
        S.toPrimitive = "@@toPrimitive";
        S.toStringTag = "@@toStringTag";
        S.hasInstance = "@@hasInstance";
        S["for"] = function (k) {
          return "@@for_" + k;
        };
        return S;
      })();

// ── WeakMap (hidden non-enumerable stamp on the key object)
var WeakMap =
  __G && __G.WeakMap
    ? __G.WeakMap
    : (function () {
        var n = 0;
        function WM() {
          this.__id = "__wm_" + ++n + "__";
        }
        WM.prototype.set = function (k, v) {
          Object.defineProperty(k, this.__id, {
            value: v,
            configurable: true,
            writable: true,
            enumerable: false,
          });
          return this;
        };
        WM.prototype.get = function (k) {
          return k == null ? undefined : k[this.__id];
        };
        WM.prototype.has = function (k) {
          return (
            k != null && Object.prototype.hasOwnProperty.call(k, this.__id)
          );
        };
        WM.prototype["delete"] = function (k) {
          if (this.has(k)) {
            delete k[this.__id];
            return true;
          }
          return false;
        };
        return WM;
      })();

// ── Map (array-backed; keys may be objects or primitives)
var Map =
  __G && __G.Map
    ? __G.Map
    : (function () {
        function M() {
          this._k = [];
          this._v = [];
          this.size = 0;
        }
        M.prototype._i = function (k) {
          for (var i = 0; i < this._k.length; i++)
            if (this._k[i] === k) return i;
          return -1;
        };
        M.prototype.has = function (k) {
          return this._i(k) !== -1;
        };
        M.prototype.get = function (k) {
          var i = this._i(k);
          return i === -1 ? undefined : this._v[i];
        };
        M.prototype.set = function (k, v) {
          var i = this._i(k);
          if (i === -1) {
            this._k.push(k);
            this._v.push(v);
            this.size++;
          } else {
            this._v[i] = v;
          }
          return this;
        };
        M.prototype["delete"] = function (k) {
          var i = this._i(k);
          if (i === -1) return false;
          this._k.splice(i, 1);
          this._v.splice(i, 1);
          this.size--;
          return true;
        };
        M.prototype.forEach = function (fn, t) {
          for (var i = 0; i < this._k.length; i++)
            fn.call(t, this._v[i], this._k[i], this);
        };
        return M;
      })();

// ── Set (array-backed; accepts an iterable-ish array in the ctor)
var Set =
  __G && __G.Set
    ? __G.Set
    : (function () {
        function St(arr) {
          this._v = [];
          this.size = 0;
          if (arr && arr.length)
            for (var i = 0; i < arr.length; i++) this.add(arr[i]);
        }
        St.prototype.has = function (x) {
          for (var i = 0; i < this._v.length; i++)
            if (this._v[i] === x) return true;
          return false;
        };
        St.prototype.add = function (x) {
          if (!this.has(x)) {
            this._v.push(x);
            this.size++;
          }
          return this;
        };
        St.prototype["delete"] = function (x) {
          for (var i = 0; i < this._v.length; i++)
            if (this._v[i] === x) {
              this._v.splice(i, 1);
              this.size--;
              return true;
            }
          return false;
        };
        St.prototype.forEach = function (fn, t) {
          for (var i = 0; i < this._v.length; i++)
            fn.call(t, this._v[i], this._v[i], this);
        };
        return St;
      })();

// ── Intl STUB — enough for the bundle to LOAD and to do non-Intl work.
//    Time-zone math for NAMED IANA zones and toLocaleString require a real
//    Intl with tz data and will throw at call time (see note below).
var Intl =
  __G && __G.Intl
    ? __G.Intl
    : (function () {
        function DateTimeFormat(locale, opts) {
          if (!(this instanceof DateTimeFormat))
            return new DateTimeFormat(locale, opts);
          this._locale = locale || "en";
          this._opts = opts || {};
        }
        DateTimeFormat.prototype.resolvedOptions = function () {
          return {
            locale: this._locale,
            calendar: this._opts.calendar || "iso8601",
            numberingSystem: "latn",
            timeZone: this._opts.timeZone || "UTC",
          };
        };
        DateTimeFormat.prototype.format = function () {
          throw new Error(
            "Intl.DateTimeFormat#format unavailable on this engine (no Intl/tz data)",
          );
        };
        DateTimeFormat.prototype.formatToParts = function () {
          throw new Error(
            "Intl.DateTimeFormat#formatToParts unavailable on this engine (no Intl/tz data)",
          );
        };
        DateTimeFormat.prototype.formatRange = DateTimeFormat.prototype.format;
        DateTimeFormat.prototype.formatRangeToParts =
          DateTimeFormat.prototype.formatToParts;
        DateTimeFormat.supportedLocalesOf = function () {
          return [];
        };
        return { DateTimeFormat: DateTimeFormat };
      })();
