var React = require('react'),
  Loading = require('./loading.jsx');

if(typeof window.jQuery === 'undefined') {
  var $ = require('jquery');
} else {
  var $ = window.jQuery;
}

var GraphContainer = React.createClass({
  propTypes: {
      data_url: React.PropTypes.string.isRequired
  },
  getInitialState: function() {
    return {
      model: {},
      data_url: this.props.data_url,
      intervalID: null,
      refresh: this.props.refresh,
      renderGraph: false
    }
  },
  getDefaultProps: function() {
    return {
      legend: false,
      refresh: false,
      onLoad: function(isLoading) {}
    }
  },
  componentDidMount: function() {
    this.refreshData();
  },
  componentWillReceiveProps: function(nextProps) {
    if(this.props.data_url !== nextProps.data_url ||
      this.props.refresh !== nextProps.refresh) {
      this.setState({
        data_url: nextProps.data_url,
        refresh: nextProps.refresh
      }, this.refreshData);
    }
  },
  componentWillUnmount: function() {
    if(this.state.intervalID !== null){
      clearInterval(this.state.intervalID);
    }
  },
  refreshData: function() {
    this.loadData(this.state.data_url);
    this.configureRefreshInterval();
  },
  loadData: function(url) {
    this.props.onLoad(true);
    $.getJSON(url, function(data) {
      this.setState({
        model: data.data,
        renderGraph: Object.keys(data.data).length > 0
      });
      this.props.onLoad(false);
    }.bind(this));
  },
  configureRefreshInterval: function() {
    this.setState(function(previousState, currentProps) {
      if(previousState.refresh && previousState.intervalID === null) {
        return {intervalID: setInterval(this.refreshData, 60000)};
      } else if(!previousState.refresh && previousState.intervalID !== null) {
        clearInterval(previousState.intervalID);
        return {intervalID: null};
      }
    });
  },
  render: function() {
    if(this.state.renderGraph){
      return (
        <div className="graph-container">
          <h2>{this.props.title}</h2>
          <Graph id={this.props.id} legend={this.props.legend} model={this.state.model} />
        </div>
      );
    } else {
      return null;
    }
  }
});

var Graph = React.createClass({
  getOptions: function() {
    return {
      xaxis: {
        mode: "time",
        timezone: "browser"
      },
      grid: {
        hoverable: true,
      },
      tooltip: {
        show: true,
        content: "%x the %s was %y"
      },
      legend: {
        position: "sw",
        show: this.props.legend
      }
    }
  },
  componentDidMount: function() {
    this.renderGraph();
  },
  componentDidUpdate: function() {
    this.renderGraph();
  },
  renderGraph: function() {
    var $elem = $("#" + this.props.id);
    var d = [];
    for (var key in this.props.model) {
      d.push({
        data: this.props.model[key],
        lines: {show: true, fill: true},
        label: key
      });
    }
    $.plot($elem, d, this.getOptions());
  },
  render: function() {
    return (
      <div id={this.props.id} className="graph"></div>
    );
  }
});

var Metrics = React.createClass({
  getInitialState: function() {
    return {
      "interval": this.props.interval,
      "from": this.props.from,
      "size": "small",
      "legend": this.props.legend,
      "refresh": true,
      "graphsLoadingCount": 0
    }
  },
  getDefaultProps: function() {
    return {
      interval: "1m",
      from: "1h",
      targetType: "app",
      legend: false,
      titles: {
        cpu_max:        "cpu (%)",
        cpu_wait:       "cpu wait (%)",
        mem_max:        "memory (MB)",
        swap:           "swap (MB)",
        connections:    "connections",
        units:          "units",
        requests_min:   "requests min",
        response_time:  "response time (seconds)",
        http_methods:   "http methods",
        status_code:    "status code",
        nettx:          "net up (KB/s)",
        netrx:          "net down (KB/s)",
        disk:           "disk space on / (MB)",
        load1:          "load 1 min",
        load5:          "load 5 min",
        load15:         "load 15 min",
      },
      metrics: [
        "cpu_max", "mem_max", "swap",
        "connections", "units"
      ]
    }
  },
  getMetricDataUrl: function(metric) {
    var targetType = this.props.targetType;
    var targetName = this.props.targetName;
    var interval = this.state.interval;
    var from = this.state.from;

    var url = "/metrics/" + targetType + "/" + targetName;
    url += "/?metric=" + metric + "&interval=" + interval + "&date_range=" + from;

    if(this.props.processName !== undefined) {
      url += "&process_name=" + this.props.processName;
    }

    return url;
  },
  getGraphContainer: function(metric) {
    var id = this.props.targetName.split('.').join('-') + "_" + metric;
    var title = this.props.titles[metric] ? this.props.titles[metric] : metric;
    return (
      <GraphContainer id={id} title={title}
        data_url={this.getMetricDataUrl(metric)}
        legend={this.state.legend} key={id}
        refresh={this.state.refresh} onLoad={this.updateGraphLoadCount}
      />
    );
  },
  updateFrom: function(from) {
    this.setState({from: from});
    if(this.props.onFromChange) {
      this.props.onFromChange(from);
    }
  },
  updateInterval: function(interval) {
    this.setState({interval: interval});
  },
  updateSize: function(size) {
    this.setState({size: size, legend: size === "large"});
  },
  updateRefresh: function(refresh) {
    this.setState({refresh: refresh});
  },
  updateGraphLoadCount: function(isLoading) {
    this.setState(function(previousState, currentProps) {
      if(isLoading) {
        return {graphsLoadingCount: previousState.graphsLoadingCount+1};
      } else {
        return {graphsLoadingCount: previousState.graphsLoadingCount-1};
      }
    });
  },
  render: function() {
    var self = this;
    var className = "graphs-" + this.state.size;
    return (
      <div className="metrics">
        <div className="metrics-options">
          <TimeRangeFilter onChange={self.updateFrom}/>
          <PeriodSelector onChange={self.updateInterval}/>
          <SizeSelector onChange={self.updateSize}/>
          <AutoRefresh onChange={self.updateRefresh} checked={self.state.refresh}/>
          {self.state.graphsLoadingCount > 0 ? <Loading className={"metrics-loader"}/> : ""}
        </div>
        <div className={className}>
          {self.props.metrics.map(function(metric) {
            return self.getGraphContainer(metric);
          })}
        </div>
      </div>
    );
  }
});

var TimeRangeFilter = React.createClass({
  handleChange: function(event) {
    this.props.onChange(event.target.value);
  },
  render: function() {
    return (
      <div className="metrics-range">
        <label>Time range:</label>
        <select name="from" onChange={this.handleChange}>
          <option value="1h">last hour</option>
          <option value="3h">last 3 hours</option>
          <option value="6h">last 6 hours</option>
          <option value="12h">last 12 hours</option>
          <option value="1d">last 24 hours</option>
          <option value="3d">last 3 days</option>
          <option value="1w">last 1 week</option>
          <option value="2w">last 2 weeks</option>
        </select>
      </div>
    )
  }
});

var PeriodSelector = React.createClass({
  handleChange: function(event) {
    this.props.onChange(event.target.value);
  },
  render: function() {
    return (
      <div className="metrics-period">
        <label>Period:</label>
        <select name="serie" onChange={this.handleChange}>
          <option value="1m">1 minute</option>
          <option value="5m">5 minutes</option>
          <option value="15m">15 minutes</option>
          <option value="1h">1 hour</option>
          <option value="6h">6 hours</option>
          <option value="1d">1 day</option>
        </select>
      </div>
    )
  }
});

var SizeSelector = React.createClass({
  handleChange: function(event) {
    this.props.onChange(event.target.value);
  },
  render: function() {
    return (
      <div className="metrics-size">
        <label>Size:</label>
        <select name="size" onChange={this.handleChange}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    )
  }
});

var AutoRefresh = React.createClass({
  getInitialState: function() {
    return {
      checked: this.props.checked
    }
  },
  handleChange: function(event) {
    var checked = event.target.checked;
    this.setState({checked: checked});
    this.props.onChange(checked);
  },
  render: function() {
    return (
      <div className="metrics-refresh">
        <input type="checkbox" name="refresh" checked={this.state.checked}
          onChange={this.handleChange} />
        <label>Auto refresh (every 60 seconds)</label>
      </div>
    )
  }
});

var WebTransactionsMetrics = React.createClass({
  render: function() {
    return (
      <Metrics metrics={["requests_min", "response_time",
        "http_methods", "status_code", "nettx", "netrx"]}
        targetName={this.props.appName}
        targetType={"app"}
        onFromChange={this.props.onFromChange}
      />
    )
  }
});

module.exports = {
    Metrics: Metrics,
    WebTransactionsMetrics: WebTransactionsMetrics,
    GraphContainer: GraphContainer,
    Graph: Graph
};
