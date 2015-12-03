module.exports = {
  tlh: {
    name: "TLH",
    agg: {
      sum: {
        field: "duration"
      }
    },
    clean: function(obj) {
      return obj.value / 3600;
    }
  },
  cume: {
    name: "Cume (Unique IPs)",
    agg: {
      cardinality: {
        field: "client.ip",
        precision_threshold: 1000
      }
    },
    clean: function(obj) {
      return obj.value;
    }
  },
  sessions: {
    name: "Sessions",
    agg: {
      cardinality: {
        field: "session_id",
        precision_threshold: 1000
      }
    },
    clean: function(obj) {
      return obj.value;
    }
  },
  atsl: {
    name: "ATSL",
    reqs: ["tlh", "sessions"],
    rollup: function(obj) {
      return obj.tlh / obj.sessions;
    }
  },
  xconnected: {
    name: "Session Duration",
    agg: {
      sum: {
        field: "connected"
      }
    },
    clean: function(obj) {
      return obj.value / 3600;
    }
  }
};

//# sourceMappingURL=metrics.js.map
