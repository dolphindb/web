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
fname = json_obj.functionName


getList = "{""SessionID"":""1212121"",""data"":[{""Mode"":""ag"",""Name"":""DBNode0"",""host"":""192.168.100.130"",""Port"":8000,""Status"":""running"",""worker"":0,""executor"":0,""CPU"":""0.4"",""MaxMemory"":""8G""},{""Mode"":""datanode"",""Name"":""DBNode1"",""host"":""192.168.100.131"",""Port"":8001,""Status"":""stopped"",""worker"":1,""executor"":1,""CPU"":""0.4"",""MaxMemory"":""8G""},{""Mode"":""datanode"",""Name"":""DBNode2"",""host"":""192.168.100.132"",""Port"":8002,""Status"":""running"",""worker"":2,""executor"":2,""CPU"":""0.4"",""MaxMemory"":""8G""},{""Mode"":""ag"",""Name"":""DBNode3"",""host"":""192.168.100.133"",""Port"":8003,""Status"":""stopped"",""worker"":3,""executor"":3,""CPU"":""0.4"",""MaxMemory"":""8G""},{""Mode"":""datanode"",""Name"":""DBNode4"",""host"":""192.168.100.134"",""Port"":8004,""Status"":""running"",""worker"":4,""executor"":0,""CPU"":""0.4"",""MaxMemory"":""8G""},{""Mode"":""ag"",""Name"":""DBNode5"",""host"":""192.168.100.135"",""Port"":8005,""Status"":""stopped"",""worker"":5,""executor"":1,""CPU"":""0.4"",""MaxMemory"":""8G""},{""Mode"":""ag"",""Name"":""DBNode6"",""host"":""192.168.100.136"",""Port"":8006,""Status"":""running"",""worker"":6,""executor"":2,""CPU"":""0.4"",""MaxMemory"":""8G""}]}"
stopNode = "{""SessionID"":""121212131212"",""resultCode"":""0"",""msg"":""""}"
startNode = "{""SessionID"":""121212131212"",""resultCode"":""-1"",""msg"":""error""}"

if fname = "getList" then
    Response.Write getList
elseif fname = "startNode" then
    Response.Write startNode
elseif fname = "stopNode" then
    Response.Write stopNode
end if
%>