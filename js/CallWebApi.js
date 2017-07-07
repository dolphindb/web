var CurrentSessionID = "0";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc, customOption) {

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

            sucfunc(data);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            errfunc(errorThrown);
        }
    }

    if (customOption)
        $.extend(option, customOption);

    $.ajax(option);
};

function CallWebApiSync(apiurl, paramstr) {
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