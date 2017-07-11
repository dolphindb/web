var nonNumeralTypes = ['string', 'second', 'minute', 'date', 'datetime', 'month', 'timestamp', 'time'];

/**
 * Plot the object given by DolphinDB plot function
 * @param {object} chartObject
 * @param {jQueryElement} elem
 */
function DolphinPlot(chartObject, elem) {
    // (new DolphinChart([[1,2,4,2,3]], [1,2,3,4,5], "myTitle", "BAR", { xTitle: "xx", yTitle: "yy" })).plot(elem[0]);
    // return;
    var chartTypes = {
        '0': 'AREA',
        '1': 'BAR',
        '2': 'COLUMN',
        '4': 'LINE',
        '5': 'PIE',
        '6': 'SCATTER'
    };
    
    var args = chartObject.value[1].value,
        titles = args[0].value,
        chartType = args[1],
        metadata = args[2],
        title = titles[0],
        xTitle = titles[1],
        yTitle = titles[2],
        yData = [],
        data = metadata.value[0].value,
        row = parseInt(metadata.value[1].value, 10),
        col = parseInt(metadata.value[2].value, 10),
        xDataType = metadata.value[3].type,
        rowLabel = xDataType === 'void' ? null : metadata.value[3].value,
        xData = rowLabel,
        yDataType = metadata.value[4].type,
        colLabel = yDataType === 'void' ? null : metadata.value[4].value,
        options = {},
        i, len;

    // Split array into chunks
    for (i = 0, len = col; i < len; i++) {
        yData.push(data.slice(i * row, i * row + row));
    }

    chartType = chartTypes[chartType];

    options = {};
    if (xTitle)
        options.xTitle = xTitle;
    if (yTitle)
        options.yTitle = yTitle;
    if (colLabel.length > 0)
        options.yLegend = colLabel;
    if (nonNumeralTypes.indexOf(xDataType) !== -1)
        options.xDataType = xDataType;

    var chart = new DolphinChart(yData, xData, title, chartType, options);
    chart.plot(elem);
    downloadVisSVG($('#btn-download'));
}

function downloadVisSVG(downloadBtn) {
    var downloadURL,
        a;

    downloadBtn.hide().unbind('click');

    if (!isDataURLSupported())
        return;

    svgToPng(document.getElementById('vis-svg'), function(res) {
        downloadURL = res;
        a = document.createElement('a');
        a.href = downloadURL;
        a.download = 'plot.png';
    });
    downloadBtn.show();
    downloadBtn.click(function(e) {
        e.preventDefault();
        a.click();
    });
}

function CustomVis(tableObj) {
    this.tableObj = tableObj;
    this.columns = $('#column-list');
    this.values = tableObj.value;

    $('#btn-custom-vis-plot')
        .attr("disabled", true)
        .unbind('click')
        .click(this.updateChart.bind(this));

    $('#x-data').html('');
    $('#custom-vis-plot').html('');

    this.columns.html('');
    this.columnCount = 0;
    this.existedColumnCount = 0;
    this.columnData = [];
    this.addColumn();

    this.createColumnOptions($('#x-data'), "x");
    $('#btn-add-column').click(this.addColumn.bind(this));
}

CustomVis.prototype.addColumn = function() {
    if (this.values.length <= 0)
        return;

    var column;
    var columnId = this.columnCount++;
    this.existedColumnCount++;

    var newColumn = $('<div />', {
        class: 'form-group',
        id: 'vis-column-' + columnId
    });

    var selectWrap = $('<div />', { class: 'col-xs-9' });
    var select = $('<select />', { class: 'form-control' });
    
    this.createColumnOptions(select, "y");

    select.appendTo(selectWrap);
    selectWrap.appendTo(newColumn);

    var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(newColumn);

    btnRemove.click(this.removeColumn(columnId).bind(this));

    newColumn.appendTo(this.columns);
    this.columnData.push({ elem: newColumn, deleted: false });
}

CustomVis.prototype.createColumnOptions = function(select, axis) {
    function isNumberType(type) {
        return ["bool", "char", "short", "int", "long", "float", "double"].indexOf(type) !== -1;
    }

    var firstOption = $('<option disabled selected value> select a column </option>').appendTo(select),
        disableCheck = axis === "y",
        column;

    for (var i = 0, len = this.values.length; i < len; i++) {
        column = this.values[i];
        $('<option />', {
            value: i,
            text: column.name,
            disabled: disableCheck && !isNumberType(column.type)    // TODO pie chart
        }).appendTo(select);
    }

    select.change(this.checkCanPlot.bind(this));
    if (axis === "x")
        select.change(function() {
            $('#x-title').val(select.find(":selected").text());
        });
}

CustomVis.prototype.checkCanPlot = function() {
    var canPlotY = function canPlotY() {
        var column, elem;
        for (var i = 0, len = this.columnData.length; i < len; i++) {
            column = this.columnData[i];
            if (column.deleted)
                continue;

            elem = column.elem;
            if (elem.find('select').val() !== null)
                return true;
        }
    }.bind(this);

    function canPlotX() {
        return $('#x-data').val() !== null;
    }
    
    if (canPlotX() && canPlotY())
        $('#btn-custom-vis-plot').attr("disabled", false);
    else
        $('#btn-custom-vis-plot').attr("disabled", true);
}

CustomVis.prototype.removeColumn = function(columnId) {
    return function() {
        $('#vis-column-' + columnId).remove();
        this.columnData[columnId].deleted = true;
        this.existedColumnCount--;
        this.checkCanPlot();
    }.bind(this);
}

CustomVis.prototype.updateChart = function(e) {
    e.preventDefault();

    var xColumn = $('#x-data').val(),
        chartType = $('#chart-type').val(),
        title = $('#chart-title').val() || '',
        xTitle = $('#x-title').val(),
        yTitle = $('#y-title').val();

    if (xColumn === null)
        return;

    if (chartType === null)
        return;

    var xDataObj = this.values[xColumn],
        xDataType = xDataObj.type,
        xData = xDataObj.value,
        yData = [],
        colLabel = [];

    var column, elem, val;

    for (var i = 0, len = this.columnData.length; i < len; i++) {
        column = this.columnData[i];
        if (column.deleted)
            continue;

        elem = column.elem;
        val = elem.find('select').val();
        if (val !== null) {
            yData.push(this.values[val].value)
            colLabel.push(this.values[val].name)
        }
    }

    if (yData.length <= 0)
        return;

    var options = {};

    if (xTitle)
        options.xTitle = xTitle;
    if (yTitle)
        options.yTitle = yTitle;
    if (colLabel.length > 0)
        options.yLegend = colLabel;
    if (nonNumeralTypes.indexOf(xDataType) !== -1)
        options.xDataType = xDataType;

    var chart = new DolphinChart(yData, xData, title, chartType, options);
    chart.plot($('#custom-vis-plot'));
    downloadVisSVG($('#btn-custom-vis-download'));
}

$(function() {
    var columnCount = 1;

    $('#custom-vis').dialog({
        autoOpen: false,
        width: 1200,
        height: 600,
        position: { my: 'center', at: 'center', of: window },
        title: 'Customize visualization',
        dialogClass: 'no-close',
        buttons: [{
            text: 'OK',
            click: function() {
                $(this).dialog('close');
            }
        }]
    });

    $('#btn-plot').click(function() {
        $('#custom-vis').dialog('open');
    });
});
