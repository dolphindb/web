$('#vis-btn').click(function() {
    $('#vis-dlg').dialog("open");
})

$('#vis-dlg').dialog({
    autoOpen: false,
    width: 800,
    height: 600,
    position: { my: "center", at: "center", of: window },
    dialogClass: "no-close",
    buttons: [
        {
            text: "OK",
            click: function () {
                $(this).dialog("close");
            }
        }
    ]
})

/**
 * Plot the object given by DolphinDB plot function
 * @param {object} chartObject
 */
function DolphinPlot(chartObject) {
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
        rowLabel = metadata.value[3].value,     // TODO recheck
        colLabel = metadata.value[4].value,
        chart = null;

    // Split array into chunks
    for (i = 0, len = col; i < len; i++) {
        yData.push(data.slice(i * row, i * row + row));
    }
    xData = rowLabel || null;

    chartType = chartTypes[chartType];
    switch (chartType) {
        case "LINE":
        case "AREA":
            chart = new DolphinChart(yData, xData, title, chartType, { xTitle: xTitle, yTitle: yTitle });
            break;
    }

    chart.plot(document.getElementById('vis-main'));
}

function main() {
    // var chart,
    //     elem = document.getElementById('vis-main');

    // //chart = new DolphinChart([2,3,4,1,3], [1,2,3,4,5], 'title', "LINE", { xLabel: "xlb", yLabel: "ylb" } );
    // //chart = new DolphinChart([4,2,5,1,3,4], ["a", "b", "c", "d", "e", "f"], "title", "PIE");
    // chart = new DolphinChart([2,3,4,-1,3], [1,2,3,4,5], 'title', "AREA", { xLabel: "xlb", yLabel: "ylb" } );
    // chart.plot(elem);
}

main();