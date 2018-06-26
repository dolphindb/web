///
var session_storage_id = "dolphindb_session_id";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc, customOption) {

    if (typeof elem === 'undefined')
        elem = $('#execute-spin');
    if (typeof CurrentSessionID === 'undefined') {
        var CurrentSessionID = 0;
    }
    if (localStorage.getItem(session_storage_id) == null||localStorage.getItem(session_storage_id)=="") {
        paramstr['sessionID'] = CurrentSessionID;
        localStorage.setItem(session_storage_id, CurrentSessionID)
    } else {
        CurrentSessionID = localStorage.getItem(session_storage_id);
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
            localStorage.setItem(session_storage_id, CurrentSessionID);

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
    if (typeof CurrentSessionID === 'undefined') {
        var CurrentSessionID = 0;
    }
    if (localStorage.getItem(session_storage_id) == null||localStorage.getItem(session_storage_id)=="") {
        paramstr['sessionID'] = CurrentSessionID;
        localStorage.setItem(session_storage_id, CurrentSessionID)
    } else {
        CurrentSessionID = localStorage.getItem(session_storage_id);
        paramstr['sessionID'] = CurrentSessionID;
    }
    paramstr['sessionID'] = CurrentSessionID;
    var d = JSON.stringify(paramstr);

    var re = $.ajax({
        url: apiurl,
        async: false,
        data: d,
        timeout: 1000,
        type: "POST",
        dataType: "json"
    });
    return JSON.parse(re.responseText);
};