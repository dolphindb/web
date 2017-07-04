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
}

DolphinChart.prototype.genRandColor = function() {
    var h = parseInt(Math.random() * 360, 10),
        s = 0.65,
        l = 0.65;
    var color = d3.hsl(h, s, l);
    return color.toString();
}

/**
 * Plot the chart in a DOM element.
 * @param {Object} elem - A DOM element 
 */
DolphinChart.prototype.plot = function(elem, width, height) {
    this.totalWidth = width || 640;
    this.totalHeight = height || 420;

    var margin = { top: 30, right: 20, bottom: 20, left: 30 },
        svg = d3.select(elem)
        .append("svg")
        .attr("width", this.totalWidth)
        .attr("height", this.totalHeight);

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

    if (!this.xData) {    // let xData be range 0..length
        this.xData = this.yData[0].map(function(x, i) { return i; });
    }

    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    switch (this.chartType) {
        case "LINE": this.plotLineChart(g, false); break;
        case "PIE": this.plotPieChart(g); break;
        case "AREA": this.plotLineChart(g, true); break;
    }
}

DolphinChart.prototype.plotLineChart = function(g, area) {
    var line, i, len,
        data = [],
        yData, tmpData;

    var xScale = d3.scaleLinear()
        .domain(d3.extent(this.xData))
        .range([0, this.width]);

    var yScale = d3.scaleLinear()
        .domain(d3.extent(d3.merge(this.yData))) // TODO yData can be array of arrays
        .range([this.height, 0]);

    for (i = 0, len = this.yData.length; i < len; i++) {
        yData = this.yData[i];
        tmpData = this.xData.map(function(data, index) { return { x: data, y: yData[index] }; })
            .sort(function(a, b) { return a.x - b.x; });
        data.push(tmpData);
    }

    // x axis
    var xAxis = g.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(xScale))

    if (this.options.xTitle) {
        xAxis.append("text")
            .attr("fill", "#000")
            .attr("x", this.width)
            .attr("y", -3)
            .attr("text-anchor", "end")
            .text(this.options.xTitle);
    }

    // y axis
    var yAxis = g.append("g")
        .call(d3.axisLeft(yScale))

    if (this.options.yTitle) {
        yAxis.append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 12)
            .attr("text-anchor", "end")
            .text(this.options.yTitle);
    }

    if (!area) {
        line = d3.line()
            .x(function(d) { return xScale(d.x); })
            .y(function(d) { return yScale(d.y); });

        g.selectAll(".curve")
            .data(data)
            .enter().append("path")
                .attr("fill", "none")
                .attr("stroke", (function(d) { return this.genRandColor() }).bind(this))  // TODO arrow
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 1.5)
                .attr("class", "curve")
                .attr("d", line);
    }
    else {
        yScale.domain(d3.extent(d3.merge(this.yData).concat([0])));

        line = d3.area()
            .x(function(d) { return xScale(d.x); })
            .y1(function(d) { return yScale(d.y); })
            .y0(yScale(0));

        g.selectAll(".curve")
            .data(data)
            .enter().append("path")
                .attr("fill", (function(d) { return this.genRandColor() }).bind(this))
                .attr("class", "curve")
                .attr("opacity", "0.5")
                .attr("d", line);
    }
}

DolphinChart.prototype.plotPieChart = function(g) {
    var yData = this.yData,
        xData = this.xData,
        radius = Math.min(this.width, this.height) / 2;

    // Move graph to the center
    g.attr("transform", "translate(" + this.totalWidth / 2 + "," + this.totalHeight / 2 + ")");

    var pie = d3.pie()
        .sort(null);

    var path = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var label = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

    var arc = g.selectAll(".vis-arc")
        .data(pie(yData))
        .enter().append("g")
            .attr("class", "vis-arc");

    // Set arcs
    arc.append("path")
        .attr("d", path)
        .attr("fill", (function(d) { return this.genRandColor() }).bind(this));

    // Set text
    arc.append("text")
        .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
        .attr("dy", "0.35em")
        .text(function(d, i) { return xData[i]; });
}

DolphinChart.prototype.plotBar = function(g) {
    
}