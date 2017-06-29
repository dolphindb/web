var CurrentSessionID = "0";

function CallWebApi(apiurl, paramstr, sucfunc, errfunc) {

    if($.cookie('ck_ag_controller_url')==null){
        paramstr['sessionid'] = CurrentSessionID;
        $.cookie('ck_ag_controller_url',CurrentSessionID)
    } else {
        CurrentSessionID = $.cookie('ck_ag_controller_url');
        paramstr['sessionid'] = CurrentSessionID;
    }
    
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
            $.cookie('ck_ag_controller_url',CurrentSessionID);
            
            sucfunc(data);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            errfunc(errorThrown);
        }
    });
};