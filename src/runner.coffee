debug   = require("debug")("sm-topline")
ES      = require "elasticsearch"
tz      = require "timezone"
CSV     = require "csv"

DayPuller   = require "./day_puller"
Metrics     = require "./metrics"

argv = require("yargs")
    .options
        server:
            describe:       "Elasticsearch Server"
            demand:         true
            requiresArg:    true
        start:
            describe:       "Start Date"
            demand:         true
            requiresArg:    true
        end:
            describe:       "End Date"
            demand:         true
            requiresArg:    true
        zone:
            describe:       "Timezone for dates"
            default:        "UTC"
        index:
            describe:       "Index: Sessions or Listens"
            default:        "sessions"
        prefix:
            describe:       "ES Index Prefix"
            default:        "streammachine"
        metrics:
            describe:       "Metrics, ordered"
            default:        "sessions,cume,tlh"
        query:
            describe:       "Elasticsearch query"
    .argv

if argv.zone != "UTC"
    zone = tz(require("timezone/#{argv.zone}"))
else
    zone = tz

es = new ES.Client host:argv.server

start_date  = zone(argv.start,argv.zone)
end_date    = zone(argv.end,argv.zone)

console.error "Stats: #{ start_date } - #{ end_date }"

# -- What metrics do we want? -- #

metrics = []

for k in argv.metrics.split(",")
    clean_k = k.toLowerCase().replace(/\s/g,'')

    if Metrics[clean_k]
        metrics.push Metrics[clean_k]
    else
        throw "Invalid metric: #{k}"

# -- Start pulling logs -- #

csv = CSV.stringify()
csv.pipe(process.stdout)

# write our column headers
csv.write ["Date",( m.name for m in metrics )...]

transform = CSV.transform (data) ->
    data[0] = zone(data[0],argv.zone,"%Y-%m-%d")
    data

puller  = new DayPuller es, zone, argv.zone, argv.prefix, argv.index, argv.query, metrics
puller.pipe(transform).pipe(csv)

ts = start_date
loop
    puller.write(ts)
    ts = tz(ts,"+1 day")
    break if ts >= end_date

puller.end()

csv.on "end", =>
    process.exit()
