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
        rowLabel = xDataType === 'void' ? [] : metadata.value[3].value,
        xData = rowLabel,
        yDataType = metadata.value[4].type,
        colLabel = yDataType === 'void' ? [] : metadata.value[4].value,
        options = {},
        i;

    // Split array into chunks
    for (i = 0; i < col; i++) {
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
    if (CustomVis.isNonNumeralType(xDataType))
        options.xDataType = xDataType;

    var chart = new DolphinChart(yData, xData, title, chartType, options);
    chart.plot(elem);
    downloadVisSVG($('#btn-download'));
}

function downloadVisSVG(downloadBtn) {
    var downloadURL,
        a;

    downloadBtn.hide().unbind('click');

    if (!Utils.isDataURLSupported() || !Utils.isBase64Supported()) {
        $('#download-format-container').hide();
        return;
    }

    var format = $('#download-format').val();
    format = typeof format === "undefined" ? "png" : format;

    svgToPic(document.getElementById('vis-svg'), CustomVis.width, CustomVis.height, format, function(res) {
        downloadURL = res;
        a = document.createElement('a');
        a.href = downloadURL;
        a.download = 'plot.' + format;
    });
    downloadBtn.show();
    downloadBtn.click(function(e) {
        e.preventDefault();
        a.click();
    });
}

function CustomVis(visObj, script) {
    this.data = [];
    this.script = script;

    switch (visObj.form) {
        case "table": {
            $('#auto-refresh-container').show();
            this.data = visObj.value;
            break;
        }
        case "matrix": {
            $('#auto-refresh-container').hide();
            var values = visObj.value,
                data = values[0].value,
                row = parseInt(values[1].value, 10),
                col = parseInt(values[2].value, 10),
                rowLabel = values[3].type === "void" ? [] : values[3].value,
                colLabel = values[4].type === "void" ? [] : values[4].value;

            for (var i = 0; i < col; i++) {
                var newCol = [];
                for (var j = 0; j < row; j++)
                    newCol.push(data[i + j * col]);
                this.data.push({
                    value: newCol,
                    name: colLabel[i] || "col" + i,
                    type: visObj.type
                });
            }
            break;
        }
    }
    this.init();
}

(function() {
    CustomVis.isNonNumeralType = function(type) {
        var nonNumeralTypes = ['symbol', 'string', 'second', 'minute', 'date', 'datetime', 'month', 'timestamp', 'time'];
        return nonNumeralTypes.indexOf(type) !== -1;
    }

    CustomVis.width = 800;
    CustomVis.height = 450;
    CustomVis.refreshInterval = 1000;
    CustomVis.refreshIntervalId = 0;
})();

CustomVis.prototype = {
    init: function() {
        var columns = $('#column-list');

        $('#btn-custom-vis-plot')
            .attr("disabled", true)
            .unbind('click')
            .click(this.updateChart.bind(this));

        $('#x-data').html('');
        $('#custom-vis-plot').html('');

        columns.html('');

        this.columnCount = 0;
        this.existedColumnCount = 0;
        this.columnData = [];
        this.addColumnTo(columns);

        this.createColumnOptions($('#x-data'), "x");
        $('#btn-add-column').unbind('click').click(function() { this.addColumnTo(columns); }.bind(this));
    },

    addColumnTo: function(columns) {
        if (this.data.length <= 0)
            return;

        var column;
        var columnId = this.columnCount++;
        this.existedColumnCount++;

        var newColumn = $('<div />', {
            class: 'form-group',
            id: 'vis-column-' + columnId
        });

        // Create select and options
        var selectWrap = $('<div />', { class: 'col-xs-7 col-md-offset-2' });
        var select = $('<select />', { class: 'form-control' });
        this.createColumnOptions(select, "y");
        select.appendTo(selectWrap);
        selectWrap.appendTo(newColumn);

        var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(newColumn);
        btnRemove.click(this.removeColumn(columnId).bind(this));

        this.columnData.push({ elem: newColumn, deleted: false });
        newColumn.appendTo(columns);
    },

    createColumnOptions: function(select, axis) {
        function isNumberType(type) {
            return ["bool", "char", "short", "int", "long", "float", "double"].indexOf(type) !== -1;
        }

        var firstOption = $('<option disabled selected value> select a column </option>').appendTo(select),
            disableCheck = axis === "y",
            column;

        for (var i = 0, len = this.data.length; i < len; i++) {
            column = this.data[i];
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
    },

    checkCanPlot: function() {
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
    },

    removeColumn: function(columnId) {
        return function() {
            $('#vis-column-' + columnId).remove();
            this.columnData[columnId].deleted = true;
            this.existedColumnCount--;
            this.checkCanPlot();
        }.bind(this);
    },

    updateChart: function(e) {
        e.preventDefault();

        if (CustomVis.refreshIntervalId !== 0)
            clearInterval(CustomVis.refreshIntervalId)

        var xColumn = $('#x-data').val(),
            chartType = $('#chart-type').val(),
            title = $('#chart-title').val() || '',
            xTitle = $('#x-title').val(),
            yTitle = $('#y-title').val(),
            autoRefresh = $('#auto-refresh').is(':checked');

        var update = (function() {
            if (xColumn === null)
                return;

            if (chartType === null)
                return;

            var xDataObj = this.data[xColumn],
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
                    yData.push(this.data[val].value)
                    colLabel.push(this.data[val].name)
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
            if (CustomVis.isNonNumeralType(xDataType))
                options.xDataType = xDataType;

            var chart = new DolphinChart(yData, xData, title, chartType, options);
            chart.plot($('#custom-vis-plot'));
            downloadVisSVG($('#btn-custom-vis-download'));
        }).bind(this);

        if (autoRefresh && typeof this.script !== 'undefined') {
            update();
            CustomVis.refreshIntervalId = setInterval((function() {
                getData(this.script, 0, undefined, (function(fullData) {
                    var fullResObj = fullData.object[0];
                    this.data = fullResObj.value;
                }).bind(this), function(err) {
                    console.log(err);
                });
                update();
            }).bind(this), CustomVis.refreshInterval);
        } else {
            update();
        }
    }
}

$(function() {
    var columnCount = 1;
    var customVis = $('#custom-vis');

    $('#custom-vis').dialog({
        autoOpen: false,
        height: 640,
        position: { my: 'center', at: 'center', of: window },
        title: 'Customize visualization',
        dialogClass: 'no-close',
        buttons: [{
            text: 'OK',
            click: function() {
                if (CustomVis.refreshIntervalId !== 0)
                    clearInterval(CustomVis.refreshIntervalId)
                $(this).dialog('close');
            }
        }]
    });

    $('#btn-plot').click(function() {
        customVis.dialog('option', 'width', Math.max($(window).width() - 200, 600));
        customVis.dialog('open');
    });

    $('#download-format').change(function() {
        downloadVisSVG($('#btn-download'));
    })
});
