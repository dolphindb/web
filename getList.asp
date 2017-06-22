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


getList = "{""SessionID"":""1212121"",""resultCode"":""0"",""object"":[]}"
stopNode = "{""SessionID"":""121212131212"",""resultCode"":""0"",""msg"":""""}"
startNode = "{""SessionID"":""121212131212"",""resultCode"":""-1"",""msg"":""error""}"

if fname = "getNodeList" then
    Response.Write getList
elseif fname = "startDataNode" then
    Response.Write startNode
elseif fname = "stopDataNode" then
    Response.Write stopNode
end if
%>