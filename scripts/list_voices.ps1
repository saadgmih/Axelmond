Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices()
foreach ($voice in $voices) {
    $info = $voice.VoiceInfo
    Write-Host "Voice Name: $($info.Name) - Culture: $($info.Culture) - Gender: $($info.Gender)"
}
$synth.Dispose()
