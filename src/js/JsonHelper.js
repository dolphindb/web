Array.prototype.where =
      function (f) {
            var fn = f;

            if (typeof f == "string")

                  if ((fn = lambda(fn)) == null)
                        throw "Syntax error in lambda string: " + f;

            var res = [];
            var l = this.length;
            var p = [0, 0, res];
            for (var i = 1; i < arguments.length; i++) p.push(arguments[i]);
            for (var i = 0; i < l; i++) {
                  if (typeof this[i] == "undefined") continue;
                  p[0] = this[i];
                  p[1] = i;
                  if (!!fn.apply(this, p)) res.push(this[i]);
            }
            return res;
      }