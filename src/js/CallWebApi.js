var CurrentSessionID = "0";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc, customOption) {
    if (typeof elem === 'undefined')
        elem = $('#execute-spin');

    if ($.cookie('sessionID') == null) {
        paramstr['sessionID'] = CurrentSessionID;
        $.cookie('sessionID', CurrentSessionID)
    } else {
        CurrentSessionID = $.cookie('sessionID');
        paramstr['sessionID'] = CurrentSessionID;
    }
    var d = JSON.stringify(paramstr);

    var option = {
        url: apiurl,
        async: true,
        data: d,
        type: "POST",
        dataType: "json",
        success: function(data, status, xhr) {

            CurrentSessionID = data["sessionID"];
            $.cookie('sessionID', CurrentSessionID);

            if (sucfunc) sucfunc(data);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            if (errfunc) errfunc(errorThrown);
        }
    }

    if (customOption)
        $.extend(option, customOption);

    $.ajax(option);
};

function CallWebApiSync(apiurl, paramstr) {
    if (typeof elem === 'undefined')
        elem = $('#execute-spin');

    paramstr['sessionID'] = CurrentSessionID;
    var d = JSON.stringify(paramstr);

    //console.log(d);
    var re = $.ajax({
        url: apiurl,
        async: false,
        data: d,
        type: "POST",
        dataType: "json"
    });
    return JSON.parse(re.responseText);
};