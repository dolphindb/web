Array.prototype.where =
      function (f) {
            var fn = f;
            // if type of parameter is string         
            if (typeof f == "string")
                  // try to make it into a function
                  if ((fn = lambda(fn)) == null)
                        // if fail, throw exception
                        throw "Syntax error in lambda string: " + f;
            // initialize result array
            var res = [];
            var l = this.length;
            // set up parameters for filter function call
            var p = [0, 0, res];
            // append any pass-through parameters to parameter array               
            for (var i = 1; i < arguments.length; i++) p.push(arguments[i]);
            // for each array element, pass to filter function
            for (var i = 0; i < l; i++) {
                  // skip missing elements
                  if (typeof this[i] == "undefined") continue;
                  // param1 = array element             
                  p[0] = this[i];
                  // param2 = current indeex
                  p[1] = i;
                  // call filter function. if return true, copy element to results            
                  if (!!fn.apply(this, p)) res.push(this[i]);
            }
            // return filtered result
            return res;
      }



//for dolphinVector2Table
function VectorArray2Table(jsonVector) {
      //get row count
      if(!isArray(jsonVector)) return;
      if(!isArray(jsonVector[0].value)) return;
      var rowcount = jsonVector[0].value.length;

      var jTable = [];
      jsonVector.forEach(function (value, index, array) {
            var valArr = value["value"];
            if (isArray(valArr)) {
                  for(var i=0;i<valArr.length;i++){
                       jTable.setRow(i,value.name,valArr[i]);
                  }
            }
      });
      return jTable;
}
//if undefine add row and set data,if exists row update data;
Array.prototype.setRow = function(index,fieldname,value){
      if(typeof this[index] === 'undefined'){
            var row = {};
            this[index] = row;
      }
      this[index][fieldname] = value;
}

function isArray(object) {
      return object && typeof object === 'object' &&
            Array == object.constructor;
}