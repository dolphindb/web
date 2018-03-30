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
            if (errfunc)
                errfunc(errorThrown);
            else
                throw errorThrown;
        }
    }

    if (customOption)
        $.extend(option, customOption);

    $.ajax(option);
};

function CallWebApiSync(apiurl, paramstr) {
    if (typeof elem === 'undefined')
        elem = $('#execute-spin');
    if ($.cookie('sessionID') == null) {
        $.cookie('sessionID', CurrentSessionID)
    } else {
        CurrentSessionID = $.cookie('sessionID');
    }
    paramstr['sessionID'] = CurrentSessionID;
    var d = JSON.stringify(paramstr);

    var re = $.ajax({
        url: apiurl,
        async: false,
        data: d,
        timeout:1000,
        type: "POST",
        dataType: "json"
    });
    return JSON.parse(re.responseText);
};