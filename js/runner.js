var CSV, DayPuller, ES, Metrics, argv, clean_k, csv, debug, end_date, es, k, m, metrics, puller, start_date, transform, ts, tz, zone, _i, _len, _ref,
  __slice = [].slice;

debug = require("debug")("sm-topline");

ES = require("elasticsearch");

tz = require("timezone");

CSV = require("csv");

DayPuller = require("./day_puller");

Metrics = require("./metrics");

argv = require("yargs").options({
  server: {
    describe: "Elasticsearch Server",
    demand: true,
    requiresArg: true
  },
  start: {
    describe: "Start Date",
    demand: true,
    requiresArg: true
  },
  end: {
    describe: "End Date",
    demand: true,
    requiresArg: true
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
  }
}).argv;

if (argv.zone !== "UTC") {
  zone = tz(require("timezone/" + argv.zone));
} else {
  zone = tz;
}

es = new ES.Client({
  host: argv.server
});

start_date = zone(argv.start, argv.zone);

end_date = zone(argv.end, argv.zone);

console.error("Stats: " + start_date + " - " + end_date);

metrics = [];

_ref = argv.metrics.split(",");
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  k = _ref[_i];
  clean_k = k.toLowerCase().replace(/\s/g, '');
  if (Metrics[clean_k]) {
    metrics.push(Metrics[clean_k]);
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
  data[0] = zone(data[0], argv.zone, "%Y-%m-%d");
  return data;
});

puller = new DayPuller(es, zone, argv.zone, argv.prefix, argv.index, argv.query, metrics);

puller.pipe(transform).pipe(csv);

ts = start_date;

while (true) {
  puller.write(ts);
  ts = tz(ts, "+1 day");
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
