/**
 * Constructor
 * @param {Array} yData - Array of arrays, input of plot
 * @param {Array} [xData] - labels of plot
 * @param {string} [chartType] - type of chart, can be LINE, BAR, AREA, PIE, COLUMN and SCATTER
 * @param {Object} [options] - options for plotting
 */
function DolphinChart(yData, xData, title, chartType, options) {
    if (typeof yData === "undefined")
        throw new Error("xData must be defined");

    this.yData = yData || null;
    this.xData = xData || null;
    this.title = title || "";
    this.chartType = chartType || "LINE";
    this.options = options || null;

    this.seed = 100;

    this.colors = null;
    this.data = [];
    this.g = null;
    this.width = this.height = this.totalWidth = this.totalHeight = 0;
    this.xScale = null;

    var getTimeFormatter = function() {
        // Set time format for PIE, BAR and COLUMN
        switch (this.options.xDataType) {
            case "month": return d3.timeFormat("%Y.%m");
            case "second": return d3.timeFormat(":%S");
            case "minute": return d3.timeFormat("%H:%M");
            case "time": return d3.timeFormat("%M:%S.%L");
            case "date": return d3.timeFormat("%Y.%m.%d");
            case "datetime": return d3.timeFormat("%H:%M:%S");
            case "timestamp": return d3.timeFormat("%M:%S.%L");
            default: return null;
        }
    }.bind(this);

    this.timeFormatter = getTimeFormatter();

    if (!this.xData || this.xData.length <= 0) {    // let xData be range 0..length TODO wait for server update
        this.xData = this.yData[0].map(function(x, i) { return i; });
    }

    // Process temporal type
    switch (this.options.xDataType) {
        case "date":
        case "month":
        case "datetime":
        case "timestamp": {
            this.xData = this.xData.map(function(d) {
                return new Date(d.replace(/[MT]/, " "));    // TODO Use JavaScript acceptable date format
            });
            break;
        }
        case "time":
        case "minute":
        case "second": {
            this.xData = this.xData.map(function(d) {
                return new Date("2000.01.01 " + d.replace("m", ""));    // TODO Create a pseudo Date object by adding a random date
            })
            break;
        }
        default: break;
    }

    // format data
    for (i = 0, len = this.yData.length; i < len; i++) {
        yData = this.yData[i];
        tmpData = this.xData
            .map(function(data, index) { return { x: data, y: yData[index] }; })
            .sort(function(a, b) { return a.x - b.x; });
        this.data.push(tmpData);
    }
}

DolphinChart.prototype = {
    maxDataSize: 15,
    /**
     * Plot the chart in a DOM element.
     * @param {Object} elem - A DOM element 
     */
    plot: function(elem, width, height) {
        if (elem.get)    // is jQuery Object
            elem = elem.get(0);

        $(elem).html("");    // clear element
        $('#vis-svg').html("");
        this.totalWidth = width || CustomVis.width;
        this.totalHeight = height || CustomVis.height;

        var i, len, yData,
            margin = { top: 30, right: 60, bottom: 20, left: 60 },
            svg = d3.select(elem)
            .append("svg")
            .attr("id", "vis-svg")
            .attr("width", this.totalWidth)
            .attr("height", this.totalHeight);;
        var shouldXDataBeNumber = (function() {
            return this.chartType === "LINE" || this.chartType === "AREA" || this.chartType === "SCATTER";
        }).bind(this);

        // make title
        if (this.title !== "") {
            svg.append("text")
                .attr("x", this.totalWidth / 2)
                .attr("y", 40)
                .attr("text-anchor", "middle")
                .attr("font-size", 28)
                .text(this.title)
            margin.top += 40;
        }

        this.width = this.totalWidth - margin.left - margin.right;
        this.height = this.totalHeight - margin.top - margin.bottom;

        this.g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Special case
        if (this.chartType === "PIE") {
            this.colors = this.genRandColorN(this.yData[0].length);
            this.options.yLegend = this.xData;
        }
        else
            this.colors = this.genRandColorN(this.yData.length);

        this.plotLegend();

        switch (this.chartType) {
            case "LINE": this.plotLineChart(); break;
            case "AREA": this.plotAreaChart(); break;
            case "PIE": this.plotPieChart(); break;
            case "BAR": this.plotBarChart(); break;
            case "COLUMN": this.plotColumnChart(); break;
            case "SCATTER": this.plotScatterChart(); break;
            default: throw new Error("Unknown chart type: " + this.chartType); break;
        }
    },

    genXScale: function() {
        var xScale;

        if (this.chartType === "BAR") {
            return d3.scaleBand()
                .domain(this.xData)
                .rangeRound([0, this.width])
                .padding(0.2);
        }
        else if (this.chartType === "COLUMN") {
            return d3.scaleBand()
                .domain(this.xData)
                .rangeRound([0, this.height])
                .padding(0.2);
        }
        else if (typeof this.options.xDataType === "undefined") {
            // Numeral xData
            return d3.scaleLinear()
                .domain(d3.extent(this.xData))
                .range([0, this.width]);
        }
        else if (this.options.xDataType === "string" || this.options.xDataType === "symbol") {
            return d3.scalePoint()
                .domain(this.xData)
                //.domain(d3.range(0, this.xData.length)) TODO x data can be same value
                .range([0, this.width]);
        }
        else {
            return xScale = d3.scaleTime()
                .domain(d3.extent(this.xData))
                .range([0, this.width]);
        }
    },

    genYScale: function() {
        if (this.chartType === "COLUMN") {
            return d3.scaleLinear()
                .domain(d3.extent(d3.merge(this.yData).concat([0])))
                .range([0, this.width]);
        }
        else if (this.chartType === "BAR" || this.chartType === "AREA") {
            return d3.scaleLinear()
                .domain(d3.extent(d3.merge(this.yData).concat([0])))
                .range([this.height, 0]);
        }
        else if (this.chartType === "LINE" || this.chartType === "SCATTER") {
            return d3.scaleLinear()
                .domain(d3.extent(d3.merge(this.yData)))    // Get extent of all yData
                .range([this.height, 0]);
        }
        else
            throw new Error("Unknown data type: " + this.chartType);
    },

    genRandColor: function() {
        var random = (function() {
            this.seed = this.seed * 16807 % 2147483647;
            return (this.seed - 1) / 2147483647;
        }).bind(this);

        var h = parseInt(random() * 360, 10),
            s = random() * 0.15 + 0.5,
            l = random() * 0.5 + 0.3;
        var color = d3.hsl(h, s, l);
        return color.toString();
    },

    genRandColorN: function(n) { // TODO use color scale
        var colors = new Array(n),
            i;
        for (i = 0; i < n; i++)
            colors[i] = this.genRandColor();

        return colors;
    },

    plotAxes: function (xScale, yScale) {
        // x axis
        var axis = d3.axisBottom(xScale);
        if (this.chartType === "BAR" && this.options.xDataType !== "string") {
            axis.tickFormat(this.timeFormatter);
            var dataSize = xScale.domain().length;
            if (dataSize > this.maxDataSize) {
                var interval = Math.max(Math.ceil(dataSize / this.maxDataSize), 1);
                axis.tickValues(xScale.domain().filter(function(d, i) {return !(i%interval); }));
            }
        }
        var xAxis = this.g.append("g")
            .attr("transform", "translate(0," + this.height + ")")
            .call(axis);

        // y axis
        axis = d3.axisLeft(yScale);
        if (this.chartType === "COLUMN" && this.options.xDataType !== "string") {
            axis.tickFormat(this.timeFormatter);
            var dataSize = yScale.domain().length;
            if (dataSize > this.maxDataSize) {
                var interval = Math.max(Math.ceil(dataSize / this.maxDataSize), 1);
                axis.tickValues(yScale.domain().filter(function(d, i) {return !(i%interval); }));
            }
        }
        var yAxis = this.g.append("g")
            .call(axis);

        if (this.options.xTitle) {
            xAxis.append("text")
                .attr("fill", "#000")
                .attr("x", this.width)
                .attr("y", -3)
                .attr("text-anchor", "end")
                .text(this.options.xTitle);
        }

        if (this.options.yTitle) {
            yAxis.append("text")
                .attr("fill", "#000")
                .attr("transform", "rotate(-90)")
                .attr("y", 12)
                .attr("text-anchor", "end")
                .text(this.options.yTitle);
        }
    },

    plotLegend: function() {
        var self = this;

        if (!this.options.yLegend || this.options.yLegend.length <= 0)
            //this.options.yLegend = new Array(this.yData.length);
            return;

        var legend = d3.select("#vis-svg")
            .selectAll(".vis-legend")
            //.data(this.colors.range())
            .data(this.colors)
            .enter().append("g")
                .attr("class", "vis-legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })

        legend.append("rect")
            .attr("x", this.totalWidth - 18)    // TODO margin-right
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", function(d) { return d; });

        legend.append("text")
            .attr("x", this.totalWidth - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function(d, i) {
                if (this.timeFormatter && this.chartType === "PIE")
                    return this.timeFormatter(this.options.yLegend[i]);
                else
                    return this.options.yLegend[i];
            }.bind(this));
    },

    plotLineChart: function() {
        var self = this,
            xScale = this.genXScale(),
            yScale = this.genYScale();

        this.plotAxes(xScale, yScale);

        var line = d3.line()
            .x(function(d) { return xScale(d.x); })
            .y(function(d) { return yScale(d.y); });

        this.g.selectAll(".vis-line")
            .data(this.data)
            .enter().append("path")
                .attr("class", "vis-line")
                .attr("fill", "none")
                .attr("stroke", function(d, i) { return self.colors[i]; })  // TODO arrow
                .attr("d", line);
    },

    plotAreaChart: function() {
        var self = this,
            xScale = this.genXScale(),
            yScale = this.genYScale();

        this.plotAxes(xScale, yScale);

        var area = d3.area()
            .x(function(d) { return xScale(d.x); })
            .y1(function(d) { return yScale(d.y); })
            .y0(yScale(0));

        if (!this.options.areaWithoutBorder) {
            var line = d3.line()
                .x(function(d) { return xScale(d.x); })
                .y(function(d) { return yScale(d.y); });

            this.g.selectAll(".vis-area-line")
                .data(this.data)
                .enter().append("path")
                    .attr("class", "vis-area-line")
                    .attr("fill", "none")
                    .attr("stroke", function(d, i) { return self.colors[i]; })  // TODO arrow
                    .attr("d", line);
        }

        this.g.selectAll(".vis-area")
            .data(this.data)
            .enter().append("path")
                .attr("class", "vis-area")
                .attr("fill", function(d, i) { return self.colors[i]; })
                .attr("stroke", function(d, i) { return self.colors[i]; })  // TODO arrow
                .attr("opacity", "0.5")
                .attr("d", area);
    },

    plotScatterChart: function() {
        var self = this;
            xScale = this.genXScale(),
            yScale = this.genYScale();

        this.plotAxes(xScale, yScale);

        this.g.selectAll(".vis-dot-group")
            .data(this.data)
            .enter().append("g")
                .attr("class", "vis-dot-group")
                .each(function(d, i) {
                    d3.select(this)
                        .selectAll(".vis-dot")
                        .data(d)
                        .enter().append("circle")
                            .attr("class", "vis-dot")
                            .attr("r", 3.5)    // TODO size
                            .attr("cx", function(d) { return xScale(d.x); })
                            .attr("cy", function(d) { return yScale(d.y); })
                            .attr("fill", self.colors[i])
                });
    },

    plotPieChart: function() {
        var yData = this.yData[this.yData.length-1],    // PIE plot uses first element of yData
            xData = this.xData,
            radius = Math.min(this.width, this.height) / 2;

        // Move graph to the center
        this.g.attr("transform", "translate(" + this.totalWidth / 2 + "," + this.totalHeight / 2 + ")");

        var pie = d3.pie()
            .sort(null);

        var path = d3.arc()
            .outerRadius(radius - 10)
            .innerRadius(0);

        var label = d3.arc()
            .outerRadius(radius - 40)
            .innerRadius(radius - 40);

        var arc = this.g.selectAll(".vis-arc")
            .data(pie(yData))
            .enter().append("g")
                .attr("class", "vis-arc");

        // Set arcs
        arc.append("path")
            .attr("d", path)
            .attr("fill", function(d, i) { return this.colors[i]; }.bind(this));

        // Set text
        arc.append("text")
            .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
            .attr("dy", "0.35em")
            .text(function(d, i) {
                if (this.timeFormatter)    // temporal
                    return this.timeFormatter(xData[i]);
                else
                    return xData[i];
            }.bind(this));
    },

    plotBarChart: function() {
        var bandwidth = 0,
            self = this,
            xScale = this.genXScale(),
            yScale = this.genYScale();

        bandwidth = xScale.bandwidth() / this.yData.length;
        if (bandwidth < 1 && !this.checkCanPlot())
            return;

        this.plotAxes(xScale, yScale);

        this.g.selectAll(".vis-bar-group")
            .data(this.data)
            .enter().append("g")
                .attr("class", "vis-bar-group")
                .each(function(d, i) {
                    d3.select(this)
                        .selectAll(".vis-bar")
                        .data(d)
                        .enter().append("rect")
                            .attr("class", "vis-bar")
                            .attr("fill", self.colors[i])
                            .attr("x", function(d) { return xScale(d.x) + bandwidth * i; })
                            .attr("y", function(d) { return yScale(d.y); })
                            .attr("width", bandwidth)
                            .attr("height", function(d) { return self.height - yScale(d.y); });    // TODO arrow function
                });  
    },

    plotColumnChart: function() {
        var bandwidth = 0,
            self = this,
            tmpTitle = "";

        var xScale = d3.scaleLinear()
            .domain(d3.extent(d3.merge(this.yData).concat([0])))
            .range([0, this.width]);

        var yScale = this.genXScale();

        bandwidth = yScale.bandwidth() / this.yData.length;
        if (bandwidth < 1 && !this.checkCanPlot())
            return;

        // Swap x and y title
        tmpTitle = this.options.xTitle;
        this.options.xTitle = this.options.yTitle;
        this.options.yTitle = tmpTitle;

        this.plotAxes(xScale, yScale);

        this.g.selectAll(".vis-bar-group")
            .data(this.data)
            .enter().append("g")
                .attr("class", "vis-bar-group")
                .each(function(d, i) {
                    d3.select(this)
                        .selectAll(".vis-bar")
                        .data(d)
                        .enter().append("rect")
                            .attr("class", "vis-bar")
                            .attr("fill", self.colors[i])
                            .attr("x", 1)
                            .attr("y", function(d) { return yScale(d.x) + bandwidth * i; })
                            .attr("width", function(d) { return xScale(d.y) - 1; })
                            .attr("height", bandwidth);    // TODO arrow function
                });  
    },

    checkCanPlot: function() {
        return confirm("There might be no enough space to plot a bar or column chart. Continue?");
    }
}
