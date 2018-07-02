$('#btn-login').click(function () {
    var ctlUrl = GetFullUrl(window.location.host);

    var username = $('#username').val();
    var password = $('#password').val();
    var controller = new ControllerServer(ctlUrl);
    controller.login(username, password, function (re) {
        if (re) {
            var re = controller.getAuthenticatedUserTicket();
            if (re.resultCode === "0") {
                var ticketstr = re.object[0].value.replaceAll("\n","\r\n");
                
                ticketstr = ticketstr.substr(0,ticketstr.length-2)
                ticketstr = "XTt65lDlhYonCoFEbWsuyBTdD66dIsMLhEb8FilTSaqzG88LU5NNt9cmCNAszz5aQ85PdhI0OzrZ\r\nPhMk3CTeBvCw9mpdbySQN1K5VPNPA2lmZcJNSpbtuJr/LxsRmaCD9TfJ4Ph863eiRlKWlUdvo7N6\r\nTrLwQbrr9jL9pfzKPnM="
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