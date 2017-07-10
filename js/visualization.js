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
    var nonNumeralTypes = ["string", "second", "minute", "date", "datetime", "month", "timestamp", "time"];
    var args = chartObject.value[1].value,
        titles = args[0].value,
        chartType = args[1],
        metadata = args[2],
        title = titles[0],
        xTitle = titles[1],
        yTitle = titles[2],
        yData = [],
        xData = null,
        data = metadata.value[0].value,
        row = parseInt(metadata.value[1].value, 10),
        col = parseInt(metadata.value[2].value, 10),
        rowDataType = metadata.value[3].type,
        rowLabel = rowDataType === "void" ? null : metadata.value[3].value,
        colDataType = metadata.value[4].type,
        colLabel = colDataType === "void" ? null : metadata.value[4].value,
        chart = null,
        options = {},
        i, len;

    // Split array into chunks
    for (i = 0, len = col; i < len; i++) {
        yData.push(data.slice(i * row, i * row + row));
    }
    xData = rowLabel;

    chartType = chartTypes[chartType];

    options = { xTitle: xTitle, yTitle: yTitle };
    if (colLabel)
        options.yLegend = colLabel;
    if (nonNumeralTypes.indexOf(rowDataType) !== -1)
        options.xDataType = rowDataType;

    chart = new DolphinChart(yData, xData, title, chartType, options);

    chart.plot(elem[0]);    // display result in jQuery element

    downloadVisSVG();
}

function downloadVisSVG() {
    var downloadURL,
        downloadBtn = $("#btn_download");

    downloadBtn.hide();

    if (!isDataURLSupported())
        return;

    svgToPng(document.getElementById('vis-svg'), function(res) {
        downloadURL = res;
        var a = $("#vis-download")
        a.attr("href", downloadURL);
        a.attr("download", "plot.png");
    });
    downloadBtn.show();
}
