var CurrentSessionID = "0";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc) {
    paramstr['sessionid'] = CurrentSessionID;
    $.ajax({
        url: apiurl,
        async: true,
        data: JSON.stringify(paramstr),
        type: "POST",
        dataType: "json",
        success: function (data, status, xhr) {
            CurrentSessionID = data["sessionid"];
            sucfunc(data);
        },
        error: function (ex) {
            errfunc(ex);
        }
    });
};