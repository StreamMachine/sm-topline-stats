var CSV, INTERVALS, Metrics, Puller, argv, clean_k, csv, debug, elasticsearch, end_date, es, interval, k, m, metrics, moment, puller, start_date, transform, ts, tz, zone, _i, _len, _ref,
  __slice = [].slice;

debug = require("debug")("sm-topline");

elasticsearch = require("@elastic/elasticsearch");

tz = require("timezone");

CSV = require("csv");

moment = require("moment");

Puller = require("./puller");

Metrics = require("./metrics");

argv = require("yargs").options({
  server: {
    describe: "Elasticsearch Server",
    demand: true,
    requiresArg: true
  },
  start: {
    describe: "Start Date",
    demand: false,
    requiresArg: false,
    "default": new moment().subtract(30, 'days').hour(0).minute(0)
  },
  end: {
    describe: "End Date",
    demand: false,
    requiresArg: false,
    "default": new moment().hour(0).minute(0)
  },
  zone: {
    describe: "Timezone for dates",
    "default": "UTC"
  },
  index: {
    describe: "Index: Sessions or Listens",
    "default": "sessions"
  },
  prefix: {
    describe: "ES Index Prefix",
    "default": "streammachine"
  },
  metrics: {
    describe: "Metrics, ordered",
    "default": "sessions,cume,tlh"
  },
  query: {
    describe: "Elasticsearch query"
  },
  interval: {
    describe: "Interval: daily, hourly or monthly",
    "default": "daily"
  }
}).argv;

INTERVALS = {
  daily: {
    tz: "+1 day",
    format: "%Y-%m-%d"
  },
  hourly: {
    tz: "+1 hour",
    format: "%Y-%m-%d %H:00:00"
  },
  monthly: {
    tz: "+1 month",
    format: "%Y-%m"
  }
};

if (argv.zone !== "UTC") {
  zone = tz(require("timezone/" + argv.zone));
} else {
  zone = tz;
}

es = new elasticsearch.Client({
  node: argv.server,
  apiVersion: '1.7'
});

start_date = zone(argv.start, argv.zone);

end_date = zone(argv.end, argv.zone);

console.error("Stats: " + start_date + " - " + end_date);

if (INTERVALS[argv.interval]) {
  interval = INTERVALS[argv.interval];
} else {
  console.error("Invalid interval: " + argv.interval);
  process.exit(1);
}

metrics = [];

_ref = argv.metrics.split(",");
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  k = _ref[_i];
  clean_k = k.toLowerCase().replace(/\s/g, '');
  if (Metrics[clean_k]) {
    m = Metrics[clean_k];
    m.key = clean_k;
    metrics.push(m);
  } else {
    throw "Invalid metric: " + k;
  }
}

csv = CSV.stringify();

csv.pipe(process.stdout);

csv.write(["Date"].concat(__slice.call((function() {
    var _j, _len1, _results;
    _results = [];
    for (_j = 0, _len1 = metrics.length; _j < _len1; _j++) {
      m = metrics[_j];
      _results.push(m.name);
    }
    return _results;
  })())));

transform = CSV.transform(function(data) {
  data[0] = zone(data[0], argv.zone, interval.format);
  return data;
});

puller = new Puller({
  es: es,
  zone: argv.zone,
  prefix: argv.prefix,
  index: argv.index,
  q: argv.query,
  metrics: metrics,
  interval: interval
});

puller.pipe(transform).pipe(csv);

ts = start_date;

while (true) {
  puller.write(ts);
  ts = zone(ts, argv.zone, interval.tz);
  if (ts >= end_date) {
    break;
  }
}

puller.end();

csv.on("end", (function(_this) {
  return function() {
    return process.exit();
  };
})(this));

//# sourceMappingURL=runner.js.map
