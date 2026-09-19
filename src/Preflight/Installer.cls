Include %occInclude

Class Preflight.Installer
{

Parameter WebRoot = "/home/irisowner/dev/dist";

ClassMethod Setup() As %Status
{
  New $NAMESPACE
  Set ns = $NAMESPACE
  Set $NAMESPACE = "%SYS"
  Set sc = ..EnsureStaticApp()
  If $$$ISERR(sc) {
    Set $NAMESPACE = ns
    Quit sc
  }
  Set sc = ..EnsureRestApp()
  Set $NAMESPACE = ns
  Quit sc
}

ClassMethod EnsureStaticApp() As %Status [ Private ]
{
  Set name = "/csp/preflight"
  Kill props
  Set props("NameSpace") = "USER"
  Set props("Path") = ..#WebRoot
  Set props("AutheEnabled") = 64
  Set props("AutoCompile") = 0
  Set props("CookiePath") = "/csp/preflight/"
  Set props("Description") = "IRIS Preflight static UI"
  Set props("Enabled") = 1
  Set props("Recurse") = 1
  Set props("ServeFiles") = 1
  Set props("DispatchClass") = ""
  Set props("MatchRoles") = ""
  Set props("Resource") = ""
  If ##class(Security.Applications).Exists(name) {
    Quit ##class(Security.Applications).Modify(name, .props)
  }
  Quit ##class(Security.Applications).Create(name, .props)
}

ClassMethod EnsureRestApp() As %Status [ Private ]
{
  Set name = "/api/preflight"
  Kill props
  Set props("NameSpace") = "USER"
  Set props("DispatchClass") = "Preflight.REST"
  Set props("AutheEnabled") = 32
  Set props("AutoCompile") = 0
  Set props("CookiePath") = "/api/preflight/"
  Set props("Description") = "IRIS Preflight snapshot and journal API"
  Set props("Enabled") = 1
  Set props("Recurse") = 1
  Set props("ServeFiles") = 0
  Set props("Path") = ""
  Set props("MatchRoles") = ""
  Set props("Resource") = ""
  If ##class(Security.Applications).Exists(name) {
    Quit ##class(Security.Applications).Modify(name, .props)
  }
  Quit ##class(Security.Applications).Create(name, .props)
}

}
