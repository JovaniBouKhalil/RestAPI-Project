# Run this after starting MongoDB and the API.
param([string]$BaseUrl = 'http://localhost:3000')
$ErrorActionPreference = 'Stop'

$note = $null
try {
    # Create a note and keep its server-generated ID.
    $note = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/notes" -ContentType 'application/json' -Body (@{
        title = 'PowerShell demo'
        body = 'Testing full CRUD'
        tags = @('demo')
    } | ConvertTo-Json)
    Write-Output 'POST created this note:'
    $note | ConvertTo-Json

    Write-Output 'GET list:'
    (Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/api/notes").Content
    Write-Output 'GET one:'
    Invoke-RestMethod -Uri "$BaseUrl/api/notes/$($note._id)" | ConvertTo-Json

    Write-Output 'PUT replacement:'
    Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/notes/$($note._id)" -ContentType 'application/json' -Body '{"title":"Replaced note","body":"New body","tags":["updated"]}' | ConvertTo-Json

    Write-Output 'PATCH body only:'
    Invoke-RestMethod -Method Patch -Uri "$BaseUrl/api/notes/$($note._id)" -ContentType 'application/json' -Body '{"body":"Partial update"}' | ConvertTo-Json
} finally {
    # Remove only the note created by this demo.
    if ($null -ne $note) {
        Invoke-RestMethod -Method Delete -Uri "$BaseUrl/api/notes/$($note._id)"
        Write-Output 'DELETE succeeded (204, no body).'
    }
}
