var CurrentSessionID = "0";
function CallWebApi(apiurl, paramstr, sucfunc, errfunc) {
    $.ajax({
        url: apiurl,
        async: true,
        data: JSON.stringify(paramstr),
        type: "POST",
        dataType: "json",
        success: function (data, status, xhr) {
            CurrentSessionID = data["sessionID"];
            sucfunc(data);
        },
        error: function(ex){
            errfunc(ex);
        }
    });
};

