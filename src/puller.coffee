tz = require "timezone"
debug = require("debug")("sm-topline")

module.exports = class Puller extends require("stream").Transform
    constructor: (@opts) ->
        @es = @opts.es
        @z = @opts.zone
        @zone = if @opts.zone != "UTC"
            tz(require("timezone/#{@opts.zone}"))
        else
            tz

        super objectMode:true

        @query = if @opts.q
            query_string:
                query: @opts.q
                default_operator: "AND"
                analyze_wildcard: true
                lowercase_expanded_terms: false
        else
            match_all: {}


        @aggs = {}
        for k,v of @opts.metrics
          @aggs[k] = v.agg

    _transform: (date,encoding,cb) ->
        debug "Running #{@zone(date,@z,"%Y.%m.%d")}"

        # Since our logstash data is stored in indices named via UTC, we
        # always want to our date + the next date

        date_end = tz(date,@opts.interval.tz)

        indices = [
            "#{@opts.prefix}-#{@opts.index}-#{@zone(date,@z,"%Y-%m-%d")}",
            "#{@opts.prefix}-#{@opts.index}-#{@zone(date_end,@z,"%Y-%m-%d")}"
        ]

        indices = indices[0] if indices[0] == indices[1]

        debug "Indices is ", indices

        filters = [
            range:
                "time":
                    gte:    tz(date,"%Y-%m-%dT%H:%M:%S.%3N%z")
                    lt:     tz(date_end,"%Y-%m-%dT%H:%M:%S.%3N%z")
        ]

        filters.push if @opts.index == "listens"
            range: { session_duration: { gte: 60 }}
        else
            range: { duration: { gte: 60 }}


        body =
            query:
                filtered:
                    query: @query
                    filter:
                        and:filters
            size: 0
            aggs: @aggs

        debug "Body is ", JSON.stringify(body)

        @es.search index:indices, body:body, (err,results) =>
            if err
                throw err

            debug "Results is ", results

            day_metrics = [date,( @opts.metrics[idx].clean?(v) || v for idx,v of results.aggregations)...]

            debug "Day metrics is ", day_metrics

            @push day_metrics

            cb()
