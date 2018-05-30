$('#btn-login').click(function() {
    var controller = GetFullUrl(window.location.host);
    var scriptExecutor = new CodeExecutor(controller);

    var username = $('#username').val();
    var password = $('#password').val();

    var script = 'login("' + 
     + '", "' + password + '")';
    script = encodeURIComponent(script);

    scriptExecutor.run(script, function(res) {

    })
})

$(document).ready(function() {
    var protocal = window.location.protocol;
    var ctlUrl = GetFullUrlHttpRestrict(window.location.host);
    var controller = new ControllerServer(ctlUrl);
    var re = new DolphinEntity(controller.getIsEnableHttps());
    if(re.toScalar() === "1"){
        if(protocal.toLowerCase()==="http:"){
            window.location.href = window.location.href.replace("http","https");
        }
    }

});