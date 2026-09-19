Include %occInclude

Class Preflight.REST Extends %CSP.REST
{

Parameter HandleCorsRequest = 1;

Parameter CONTENTTYPE = "application/json";

Parameter CHARSET = "utf-8";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/ping" Method="GET" Call="Ping" />
  <Route Url="/entries" Method="GET" Call="ListEntries" />
  <Route Url="/entries" Method="POST" Call="CreateEntry" />
  <Route Url="/entries" Method="DELETE" Call="ClearEntries" />
  <Route Url="/entries/:id" Method="GET" Call="GetEntry" />
  <Route Url="/entries/:id" Method="PUT" Call="UpdateEntry" />
  <Route Url="/entries/:id" Method="DELETE" Call="DeleteEntry" />
</Routes>
}

ClassMethod OnPreDispatch(pUrl As %String, pMethod As %String, ByRef pContinue As %Boolean) As %Status
{
  Do %response.SetHeader("Cache-Control", "no-cache")
  Set %response.ContentType = "application/json"
  Quit $$$OK
}

ClassMethod Ping() As %Status
{
  Set out = {"status":"ok","username":($USERNAME),"namespace":($NAMESPACE)}
  Quit ..WriteJSON(out)
}

ClassMethod ListEntries() As %Status
{
  Set out = []
  Set stmt = ##class(%SQL.Statement).%ExecDirect(,"SELECT ID FROM Preflight.Snapshot WHERE Username = ? ORDER BY ID DESC", $USERNAME)
  While stmt.%Next() {
    Set row = ##class(Preflight.Snapshot).%OpenId(stmt.%Get("ID"))
    If $IsObject(row) {
      Do out.%Push(row.ToDynamicObject())
    }
  }
  Quit ..WriteJSON(out)
}

ClassMethod CreateEntry() As %Status
{
  Set data = ..ReadBody()
  If data = "" Quit ..WriteError(400, "Request body required")
  Set row = ##class(Preflight.Snapshot).%New()
  Set row.Username = $USERNAME
  Set row.CreatedAt = $ZDateTime($Horolog, 3)
  Set row.Type = data.%Get("type", "journal")
  Set row.OperationId = data.%Get("operationId")
  Set row.Method = data.%Get("method")
  Set row.Path = data.%Get("path")
  Set row.Url = data.%Get("url")
  Set row.Risk = data.%Get("risk")
  Set row.HttpStatus = data.%Get("httpStatus")
  Set row.RolledBack = data.%Get("rolledBack", 0)
  Set row.AsyncTaskGUID = data.%Get("asyncTaskGUID")
  Set row.ErrorText = data.%Get("error")
  Do ##class(Preflight.Snapshot).WriteStream(row.ParamsJSON, ..ValueToJSON(data.%Get("params")))
  Do ##class(Preflight.Snapshot).WriteStream(row.BodyJSON, ..ValueToJSON(data.%Get("body")))
  Do ##class(Preflight.Snapshot).WriteStream(row.BeforeJSON, ..ValueToJSON(data.%Get("before")))
  Do ##class(Preflight.Snapshot).WriteStream(row.AfterJSON, ..ValueToJSON(data.%Get("after")))
  Set sc = row.%Save()
  If $$$ISERR(sc) Quit ..WriteError(500, $SYSTEM.Status.GetErrorText(sc))
  Set %response.Status = 201
  Quit ..WriteJSON(row.ToDynamicObject())
}

ClassMethod GetEntry(id As %String) As %Status
{
  Set row = ##class(Preflight.Snapshot).%OpenId(id)
  If '$IsObject(row) Quit ..WriteError(404, "Entry not found")
  If row.Username '= $USERNAME Quit ..WriteError(403, "Not your entry")
  Quit ..WriteJSON(row.ToDynamicObject())
}

ClassMethod UpdateEntry(id As %String) As %Status
{
  Set row = ##class(Preflight.Snapshot).%OpenId(id)
  If '$IsObject(row) Quit ..WriteError(404, "Entry not found")
  If row.Username '= $USERNAME Quit ..WriteError(403, "Not your entry")
  Set data = ..ReadBody()
  If data = "" Quit ..WriteError(400, "Request body required")
  If data.%IsDefined("rolledBack") Set row.RolledBack = data.%Get("rolledBack")
  If data.%IsDefined("httpStatus") Set row.HttpStatus = data.%Get("httpStatus")
  If data.%IsDefined("asyncTaskGUID") Set row.AsyncTaskGUID = data.%Get("asyncTaskGUID")
  If data.%IsDefined("error") Set row.ErrorText = data.%Get("error")
  If data.%IsDefined("after") {
    Do ##class(Preflight.Snapshot).WriteStream(row.AfterJSON, ..ValueToJSON(data.%Get("after")))
  }
  If data.%IsDefined("before") {
    Do ##class(Preflight.Snapshot).WriteStream(row.BeforeJSON, ..ValueToJSON(data.%Get("before")))
  }
  Set sc = row.%Save()
  If $$$ISERR(sc) Quit ..WriteError(500, $SYSTEM.Status.GetErrorText(sc))
  Quit ..WriteJSON(row.ToDynamicObject())
}

ClassMethod DeleteEntry(id As %String) As %Status
{
  Set row = ##class(Preflight.Snapshot).%OpenId(id)
  If '$IsObject(row) Quit ..WriteError(404, "Entry not found")
  If row.Username '= $USERNAME Quit ..WriteError(403, "Not your entry")
  Set sc = ##class(Preflight.Snapshot).%DeleteId(id)
  If $$$ISERR(sc) Quit ..WriteError(500, $SYSTEM.Status.GetErrorText(sc))
  Set %response.Status = 204
  Quit $$$OK
}

ClassMethod ClearEntries() As %Status
{
  Set stmt = ##class(%SQL.Statement).%ExecDirect(,"SELECT ID FROM Preflight.Snapshot WHERE Username = ?", $USERNAME)
  While stmt.%Next() {
    Do ##class(Preflight.Snapshot).%DeleteId(stmt.%Get("ID"))
  }
  Set %response.Status = 204
  Quit $$$OK
}

ClassMethod ReadBody() As %DynamicObject
{
  Set result = ""
  If '$IsObject(%request.Content) Quit result
  Try {
    Set result = ##class(%DynamicAbstractObject).%FromJSON(%request.Content)
  } Catch ex {
    Set result = ""
  }
  Quit result
}

ClassMethod ValueToJSON(value As %DynamicAbstractObject) As %String
{
  If '$IsObject(value) {
    If value = "" Quit ""
    Quit value
  }
  Quit value.%ToJSON()
}

ClassMethod WriteJSON(obj As %DynamicAbstractObject) As %Status
{
  Set %response.ContentType = "application/json"
  Write obj.%ToJSON()
  Quit $$$OK
}

ClassMethod WriteError(code As %Integer, message As %String) As %Status
{
  Set %response.Status = code
  Set obj = {"error": (message)}
  Quit ..WriteJSON(obj)
}

}
