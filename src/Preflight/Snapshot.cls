Include %occInclude

Class Preflight.Snapshot Extends %Persistent
{

/// "snapshot" for a pre-write object copy, "journal" for an executed call.
Property Type As %String(MAXLEN = 16) [ Required ];

Property Username As %String(MAXLEN = 128);

Property CreatedAt As %TimeStamp;

Property OperationId As %String(MAXLEN = 200);

Property Method As %String(MAXLEN = 16);

Property Path As %String(MAXLEN = 500);

Property Url As %String(MAXLEN = 2000);

Property Risk As %String(MAXLEN = 32);

Property HttpStatus As %Integer;

Property RolledBack As %Boolean [ InitialExpression = 0 ];

Property AsyncTaskGUID As %String(MAXLEN = 128);

Property ParamsJSON As %Stream.GlobalCharacter;

Property BodyJSON As %Stream.GlobalCharacter;

Property BeforeJSON As %Stream.GlobalCharacter;

Property AfterJSON As %Stream.GlobalCharacter;

Property ErrorText As %String(MAXLEN = 2000);

Index UsernameIdx On Username;

Index CreatedAtIdx On CreatedAt;

ClassMethod WriteStream(stream As %Stream.Object, value As %String(MAXLEN = "")) As %Status
{
  If '$IsObject(stream) Quit $$$OK
  Do stream.Clear()
  If value = "" Quit $$$OK
  Quit stream.Write(value)
}

ClassMethod ReadStream(stream As %Stream.Object) As %String(MAXLEN = "")
{
  If '$IsObject(stream) Quit ""
  Do stream.Rewind()
  Set out = ""
  While 'stream.AtEnd {
    Set out = out_stream.Read(32000)
  }
  Quit out
}

ClassMethod ParseJSON(raw As %String(MAXLEN = "")) As %DynamicAbstractObject
{
  Set result = ""
  If raw = "" Quit result
  Try {
    Set result = ##class(%DynamicAbstractObject).%FromJSON(raw)
  } Catch ex {
    Set result = ""
  }
  Quit result
}

Method ToDynamicObject() As %DynamicObject
{
  Set obj = {}
  Do obj.%Set("id", ..%Id())
  Do obj.%Set("type", ..Type)
  Do obj.%Set("username", ..Username)
  Do obj.%Set("createdAt", ..CreatedAt)
  Do obj.%Set("operationId", ..OperationId)
  Do obj.%Set("method", ..Method)
  Do obj.%Set("path", ..Path)
  Do obj.%Set("url", ..Url)
  Do obj.%Set("risk", ..Risk)
  Do obj.%Set("httpStatus", ..HttpStatus)
  Do obj.%Set("rolledBack", ..RolledBack)
  Do obj.%Set("asyncTaskGUID", ..AsyncTaskGUID)
  Do obj.%Set("error", ..ErrorText)
  Set parsed = ..ParseJSON(..ReadStream(..ParamsJSON))
  If parsed '= "" Do obj.%Set("params", parsed)
  Set parsed = ..ParseJSON(..ReadStream(..BodyJSON))
  If parsed '= "" Do obj.%Set("body", parsed)
  Set parsed = ..ParseJSON(..ReadStream(..BeforeJSON))
  If parsed '= "" Do obj.%Set("before", parsed)
  Set parsed = ..ParseJSON(..ReadStream(..AfterJSON))
  If parsed '= "" Do obj.%Set("after", parsed)
  Quit obj
}

}
