/**
 * Plot the object given by DolphinDB plot function
 * @param {object} chartObject
 * @param {jQueryElement} elem
 */
function DolphinPlot(chartObject, elem) {
    // (new DolphinChart([[1,2,4,2,3]], [1,2,3,4,5], "myTitle", "BAR", { xTitle: "xx", yTitle: "yy" })).plot(elem[0]);
    // return;

    var chartTypes = {
        "0": "AREA",
        "1": "BAR",
        "2": "COLUMN",
        "4": "LINE",
        "5": "PIE",
        "6": "SCATTER"
    };
    var args = chartObject.value[1].value,
        titles = args[0].value,
        chartType = args[1],
        metadata = args[2],
        title = titles[0],
        xTitle = titles[1],
        yTitle = titles[2],
        i, len,
        yData = [],
        xData = null,
        data = metadata.value[0].value,
        row = parseInt(metadata.value[1].value, 10),
        col = parseInt(metadata.value[2].value, 10),
        rowLabel = metadata.value[3] && metadata.value[3].value,     // TODO recheck
        colLabel = metadata.value[4] && metadata.value[4].value,
        chart = null;

    // Split array into chunks
    for (i = 0, len = col; i < len; i++) {
        yData.push(data.slice(i * row, i * row + row));
    }
    xData = rowLabel || null;

    chartType = chartTypes[chartType];
    chart = new DolphinChart(yData, xData, title, chartType, {
        xTitle: xTitle,
        yTitle: yTitle,
        yLegend: colLabel
    });

    chart.plot(elem[0]);    // display result in jQuery element
}
