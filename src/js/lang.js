var langfile = $.cookie("language_file");
jQuery.getScript(langfile)
    .done(function () {
        langobj.forEach(function (val, index, arr) {
            var ele = $('#' + val.key);
            ele.html(val.value + ele.html());
        });
    });