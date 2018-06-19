$('#btn-login').click(function() {
    var ctlUrl = GetFullUrl(window.location.host);
    
    var username = $('#username').val();
    var password = $('#password').val();
    var controller = new ControllerServer(ctlUrl);
    controller.login(username,password,function(re){
        location.href = "default.html";
    });
    
})

$(document).ready(function() {
    HandleUrlOverHttp();
});