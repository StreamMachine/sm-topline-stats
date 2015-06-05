module.exports =
    tlh:
        name: "TLH"
        agg:
            sum:
                field: "duration"
        clean: (obj) ->
            obj.value / 3600

    cume:
        name: "Cume (Unique IPs)"
        agg:
            cardinality:
                field: "client.ip"
                precision_threshold: 1000
        clean: (obj) ->
            obj.value

    sessions:
        name: "Sessions"
        agg:
            cardinality:
                field: "session_id"
                precision_threshold: 1000
        clean: (obj) ->
            obj.value
