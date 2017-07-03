$('#vis-btn').click(function() {
    show_vis_dialog();
})

function show_vis_dialog() {
    $('#vis-dlg').dialog({
        width: 800,
        height: 600,
        position: { my: "center", at: "center", of: window },
        dialogClass: "no-close",
        buttons: [
            {
                text: "OK",
                click: function () {
                    $(this).dialog("close");
                }
            }
        ]
    })
}