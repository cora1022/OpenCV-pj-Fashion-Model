param([string]$BaseUrl = "http://localhost")

Invoke-WebRequest "$BaseUrl/health/live" | Select-Object StatusCode
Invoke-WebRequest "$BaseUrl/" | Select-Object StatusCode
try { Invoke-WebRequest "$BaseUrl/health/ready" | Select-Object StatusCode } catch { $_.Exception.Response.StatusCode.value__ }
