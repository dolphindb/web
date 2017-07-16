$.msgbox = function(s,callback){
     new Noty({
                        text: s,
                        type: 'success',
                        layout:'topCenter',
                        theme :'relax',
                        timeout: 3000,
                        callbacks: {
                            afterClose: callback
                        }
                    }).show();
}

$.alert = function(s,callback){
     new Noty({
                        text: s,
                        type: 'alert',
                        layout:'topCenter',
                        theme :'relax',
                        timeout: 3000,
                        callbacks: {
                            afterClose: callback
                        }
                    }).show();
}