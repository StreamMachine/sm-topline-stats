var Puller, debug, tz,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

tz = require("timezone");

debug = require("debug")("sm-topline");

module.exports = Puller = (function(_super) {
  __extends(Puller, _super);

  function Puller(opts) {
    var k, v, _ref;
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
    this.aggs = {};
    _ref = this.opts.metrics;
    for (k in _ref) {
      v = _ref[k];
      this.aggs[k] = v.agg;
    }
  }

  Puller.prototype._transform = function(date, encoding, cb) {
    var body, date_end, filters, indices;
    debug("Running " + (this.zone(date, this.z, "%Y.%m.%d")));
    date_end = tz(date, this.opts.interval.tz);
    indices = ["" + this.opts.prefix + "-" + this.opts.index + "-" + (this.zone(date, this.z, "%Y-%m-%d")), "" + this.opts.prefix + "-" + this.opts.index + "-" + (this.zone(date_end, this.z, "%Y-%m-%d"))];
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
        var day_metrics, idx, v;
        if (err) {
          throw err;
        }
        debug("Results is ", results);
        day_metrics = [date].concat(__slice.call((function() {
            var _base, _ref, _results;
            _ref = results.aggregations;
            _results = [];
            for (idx in _ref) {
              v = _ref[idx];
              _results.push((typeof (_base = this.opts.metrics[idx]).clean === "function" ? _base.clean(v) : void 0) || v);
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
