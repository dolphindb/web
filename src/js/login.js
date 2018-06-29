$('#btn-login').click(function () {
    var ctlUrl = GetFullUrl(window.location.host);

    var username = $('#username').val();
    var password = $('#password').val();
    var controller = new ControllerServer(ctlUrl);
    controller.login(username, password, function (re) {
        if (re) {
            var re = controller.getAuthenticatedUserTicket();
            if (re.resultCode === "0") {
                var ticketstr = re.object[0].value;               
                localStorage.setItem("dolphindb_ticket", ticketstr);
            }
            location.href = "default.html";
        } else {
            $("#lblMsg").text("The user name or password is incorrect.")
        }

    });

})

$(document).ready(function () {
    HandleUrlOverHttp();
});

$('#password').bind("keypress", function (e) {
    if (e.keyCode === 13) {
        $('#btn-login').click();
    }
})