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

    this.colors = null;
    this.data = [];
    this.g = null;
    this.width = this.height = this.totalWidth = this.totalHeight = 0;
    this.xScale = null;
}

/**
 * Plot the chart in a DOM element.
 * @param {Object} elem - A DOM element 
 */
DolphinChart.prototype.plot = function(elem, width, height) {
    $(elem).html("");    // clear element
    this.totalWidth = width || 680;
    this.totalHeight = height || 420;

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

    if (!this.xData) {    // let xData be range 0..length TODO wait for server update
        this.xData = this.yData[0].map(function(x, i) { return i; });
    }

    // Process temporal type
    switch (this.options.xDataType) {
        case "date":
        case "month":
        case "datetime":
        case "timestamp":
            this.xData = this.xData.map(function(d) {
                return new Date(d.replace(/[MT]/, " "));    // Use JavaScript acceptable date format
            });
            break;
        case "time":
        case "minute":
        case "second":
            this.xData = this.xData.map(function(d) {
                return new Date("2000.01.01 " + d.replace("m", ""));    // Create a pseudo Date object by adding a random date
            })
            break;
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
}

DolphinChart.prototype.genXScale = function() {
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
    else if (this.options.xDataType === "string") {
        return d3.scalePoint()
            .domain(this.xData)
            .range([0, this.width]);
    }
    else {
        xScale = d3.scaleTime()
            .domain(d3.extent(this.xData))
            .range([0, this.width]);

        switch (this.options.xDataType) {
            case "date":
            case "month":
            case "time":
            case "minute":
            case "second":
            case "timestamp":
            case "datetime": break;
            default: throw new Error("Unknown data type: " + this.chartType); break;
        }

        return xScale;
    }
}

DolphinChart.prototype.genYScale = function() {
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
}

DolphinChart.prototype.genRandColor = function() {
    var h = parseInt(Math.random() * 360, 10),
        s = Math.random() * 0.15 + 0.5,
        l = Math.random() * 0.5 + 0.3;
    var color = d3.hsl(h, s, l);
    return color.toString();
}

DolphinChart.prototype.genRandColorN = function(n) { // TODO use color scale
    var colors = new Array(n),
        i;
    for (i = 0; i < n; i++)
        colors[i] = this.genRandColor();

    return colors;
    return d3.scaleOrdinal()
        .range(colors);
}

DolphinChart.prototype.plotAxes = function (xScale, yScale) {
    // x axis
    var xAxis = this.g.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(xScale));

    // y axis
    var yAxis = this.g.append("g")
        .call(d3.axisLeft(yScale));

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
}

DolphinChart.prototype.plotLegend = function() {
    var self = this;

    if (!this.options.yLegend)
        this.options.yLegend = new Array(this.yData.length);

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
        .text(function(d, i) { return self.options.yLegend[i]; });
}

DolphinChart.prototype.plotLineChart = function() {
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
            .attr("fill", "none")
            .attr("stroke", function(d, i) { return self.colors[i]; })  // TODO arrow
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("class", "vis-line")
            .attr("d", line);
}

DolphinChart.prototype.plotAreaChart = function() {
    var self = this,
        xScale = this.genXScale(),
        yScale = this.genYScale();

    this.plotAxes(xScale, yScale);

    var area = d3.area()
        .x(function(d) { return xScale(d.x); })
        .y1(function(d) { return yScale(d.y); })
        .y0(yScale(0));

    this.g.selectAll(".vis-area")
        .data(this.data)
        .enter().append("path")
            .attr("fill", function(d, i) { return self.colors[i]; })
            .attr("class", "vis-area")
            .attr("opacity", "0.5")
            .attr("d", area);
}

DolphinChart.prototype.plotScatterChart = function() {
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
}

DolphinChart.prototype.plotPieChart = function() {
    var self = this;

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
        .attr("fill", function(d, i) { return self.colors[i]; });

    // Set text
    arc.append("text")
        .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
        .attr("dy", "0.35em")
        .text(function(d, i) { return xData[i]; });
}

DolphinChart.prototype.plotBarChart = function() {
    var bandwidth = 0,
        self = this;
        xScale = this.genXScale(),
        yScale = this.genYScale();

    bandwidth = xScale.bandwidth() / this.yData.length;

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
}

DolphinChart.prototype.plotColumnChart = function() {
    var bandwidth = 0,
        self = this,
        tmpTitle = "";

    var xScale = d3.scaleLinear()
        .domain(d3.extent(d3.merge(this.yData).concat([0])))
        .range([0, this.width]);

    var yScale = this.genXScale();

    bandwidth = yScale.bandwidth() / this.yData.length;

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
}
