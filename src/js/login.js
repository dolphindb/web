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
    HandleUrlOverHttp();
});