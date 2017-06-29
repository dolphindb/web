var CurrentSessionID = "0";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc) {
    paramstr['sessionid'] = CurrentSessionID;
    //console.log(paramstr);
    var d = JSON.stringify(paramstr);
    //console.log(d);
    $.ajax({
        url: apiurl,
        async: true,
        data: d,
        type: "POST",
        dataType: "json",
        success: function (data, status, xhr) {
            CurrentSessionID = data["sessionid"];
            sucfunc(data);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            errfunc(errorThrown);
        }
    });
};