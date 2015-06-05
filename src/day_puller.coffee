tz = require "timezone"
debug = require("debug")("sm-topline")

module.exports = class DayPuller extends require("stream").Transform
    constructor: (@es,@zone,@z,@prefix,@index,q,@metrics)->
        super objectMode:true

        @query = if q
            query_string:
                query: q
                default_operator: "AND"
        else
            match_all: {}


        @aggs = {}
        for k,v of @metrics
          @aggs[k] = v.agg

    _transform: (date,encoding,cb) ->
        debug "Running #{@zone(date,@z,"%Y.%m.%d")}"

        # Since our logstash data is stored in indices named via UTC, we
        # always want to our date + the next date

        tomorrow = tz(date,"+1 day")

        indices = [
            "#{@prefix}-#{@index}-#{@zone(date,@z,"%Y-%m-%d")}",
            "#{@prefix}-#{@index}-#{@zone(tomorrow,@z,"%Y-%m-%d")}"
        ]

        debug "Indices is ", indices

        filters = [
            range:
                "time":
                    gte:    tz(date,"%Y-%m-%dT%H:%M:%S.%3N%z")
                    lt:     tz(tomorrow,"%Y-%m-%dT%H:%M:%S.%3N%z")
        ]

        filters.push if @index == "listens"
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

            day_metrics = [date,( @metrics[idx].clean?(v) || v for idx,v of results.aggregations)...]

            debug "Day metrics is ", day_metrics

            @push day_metrics

            cb()
