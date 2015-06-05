var DayPuller, debug, tz,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

tz = require("timezone");

debug = require("debug")("sm-topline");

module.exports = DayPuller = (function(_super) {
  __extends(DayPuller, _super);

  function DayPuller(es, zone, z, prefix, index, q, metrics) {
    var k, v, _ref;
    this.es = es;
    this.zone = zone;
    this.z = z;
    this.prefix = prefix;
    this.index = index;
    this.metrics = metrics;
    DayPuller.__super__.constructor.call(this, {
      objectMode: true
    });
    this.query = q ? {
      query_string: {
        query: q,
        default_operator: "AND"
      }
    } : {
      match_all: {}
    };
    this.aggs = {};
    _ref = this.metrics;
    for (k in _ref) {
      v = _ref[k];
      this.aggs[k] = v.agg;
    }
  }

  DayPuller.prototype._transform = function(date, encoding, cb) {
    var body, filters, indices, tomorrow;
    debug("Running " + (this.zone(date, this.z, "%Y.%m.%d")));
    tomorrow = tz(date, "+1 day");
    indices = ["" + this.prefix + "-" + this.index + "-" + (this.zone(date, this.z, "%Y-%m-%d")), "" + this.prefix + "-" + this.index + "-" + (this.zone(tomorrow, this.z, "%Y-%m-%d"))];
    debug("Indices is ", indices);
    filters = [
      {
        range: {
          "time": {
            gte: tz(date, "%Y-%m-%dT%H:%M:%S.%3N%z"),
            lt: tz(tomorrow, "%Y-%m-%dT%H:%M:%S.%3N%z")
          }
        }
      }
    ];
    filters.push(this.index === "listens" ? {
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
              _results.push((typeof (_base = this.metrics[idx]).clean === "function" ? _base.clean(v) : void 0) || v);
            }
            return _results;
          }).call(_this)));
        debug("Day metrics is ", day_metrics);
        _this.push(day_metrics);
        return cb();
      };
    })(this));
  };

  return DayPuller;

})(require("stream").Transform);

//# sourceMappingURL=day_puller.js.map
