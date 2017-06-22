<script language="javascript" runat="server">
function parseToJson(json_data)
{
    eval("var o=" + json_data);
    return o;
}
</script>

<%
    bytecount = Request.TotalBytes
bytes = Request.BinaryRead(bytecount)

Set stream = Server.CreateObject("ADODB.Stream")
    stream.Type = 1 'adTypeBinary              
    stream.Open()                                   
        stream.Write(bytes)
        stream.Position = 0                             
        stream.Type = 2 'adTypeText                
        stream.Charset = "utf-8"                      
        s = stream.ReadText() 'here is your json as a string                
    stream.Close()
Set stream = nothing


Set json_obj=parseToJson(s)
fname = json_obj.functionname

dim out_json
set fs=server.createobject("scripting.filesystemobject") 
file=server.mappath("testdata/" & fname & ".txt")
set txt=fs.opentextfile(file,1,true) 

out_json=txt.readAll

Response.Write out_json
%>