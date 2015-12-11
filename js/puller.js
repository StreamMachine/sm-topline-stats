var Puller, debug, tz,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

tz = require("timezone");

debug = require("debug")("sm-topline");

module.exports = Puller = (function(_super) {
  __extends(Puller, _super);

  function Puller(opts) {
    var v, _i, _len, _ref;
    this.opts = opts;
    this.es = this.opts.es;
    this.z = this.opts.zone;
    this.zone = this.opts.zone !== "UTC" ? tz(require("timezone/" + this.opts.zone)) : tz;
    Puller.__super__.constructor.call(this, {
      objectMode: true
    });
    this.query = this.opts.q ? {
      query_string: {
        query: this.opts.q,
        default_operator: "AND",
        analyze_wildcard: true,
        lowercase_expanded_terms: false
      }
    } : {
      match_all: {}
    };
    debug("Passed in metrics is ", this.opts.metrics);
    this.aggs = {};
    this.rollups = {};
    _ref = this.opts.metrics;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      v = _ref[_i];
      this.aggs[v.key] = v.agg;
      if (v.rollup != null) {
        this.rollups[v.key] = v.rollup;
      }
    }
  }

  Puller.prototype._transform = function(date, encoding, cb) {
    var body, date_end, filters, indices, ts;
    debug("Running " + (this.zone(date, this.z, "%Y.%m.%d")));
    date_end = this.zone(date, this.z, this.opts.interval.tz);
    indices = [];
    ts = date;
    while (true) {
      indices.push("" + this.opts.prefix + "-" + this.opts.index + "-" + (this.zone(ts, this.z, "%Y-%m-%d")));
      ts = this.zone(ts, this.z, "+1 day");
      if (ts > date_end) {
        break;
      }
    }
    if (indices[0] === indices[1]) {
      indices = indices[0];
    }
    debug("Indices is ", indices);
    filters = [
      {
        range: {
          "time": {
            gte: tz(date, "%Y-%m-%dT%H:%M:%S.%3N%z"),
            lt: tz(date_end, "%Y-%m-%dT%H:%M:%S.%3N%z")
          }
        }
      }
    ];
    filters.push(this.opts.index === "listens" ? {
      range: {
        session_duration: {
          gte: 60
        }
      }
    } : {
      range: {
        duration: {
          gte: 60
        }
      }
    });
    body = {
      query: {
        filtered: {
          query: this.query,
          filter: {
            and: filters
          }
        }
      },
      size: 0,
      aggs: this.aggs
    };
    debug("Body is ", JSON.stringify(body));
    return this.es.search({
      index: indices,
      body: body
    }, (function(_this) {
      return function(err, results) {
        var day_metrics, f, k, m, metrics, v, _i, _len, _ref, _ref1;
        if (err) {
          throw err;
        }
        debug("Results is ", results);
        metrics = {};
        _ref = _this.opts.metrics;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          v = results.aggregations[m.key];
          metrics[m.key] = (typeof m.clean === "function" ? m.clean(v) : void 0) || v;
        }
        _ref1 = _this.rollups;
        for (k in _ref1) {
          f = _ref1[k];
          metrics[k] = f(metrics);
        }
        debug("Metrics is ", metrics);
        day_metrics = [date].concat(__slice.call((function() {
            var _j, _len1, _ref2, _results;
            _ref2 = this.opts.metrics;
            _results = [];
            for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
              m = _ref2[_j];
              _results.push(metrics[m.key]);
            }
            return _results;
          }).call(_this)));
        debug("Day metrics is ", day_metrics);
        _this.push(day_metrics);
        return cb();
      };
    })(this));
  };

  return Puller;

})(require("stream").Transform);

//# sourceMappingURL=puller.js.map
