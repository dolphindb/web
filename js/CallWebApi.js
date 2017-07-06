var CurrentSessionID = "0";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc) {

    if ($.cookie('ck_ag_controller_url') == null) {
        paramstr['sessionID'] = CurrentSessionID;
        $.cookie('ck_ag_controller_url', CurrentSessionID)
    } else {
        CurrentSessionID = $.cookie('ck_ag_controller_url');
        paramstr['sessionID'] = CurrentSessionID;
    }
    var d = JSON.stringify(paramstr);
    $.ajax({
        url: apiurl,
        async: true,
        data: d,
        type: "POST",
        dataType: "json",
        success: function(data, status, xhr) {

            CurrentSessionID = data["sessionID"];
            $.cookie('ck_ag_controller_url', CurrentSessionID);

            sucfunc(data);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            errfunc(errorThrown);
        }
    });
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