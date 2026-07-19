Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("test_voice.wav")
$synth.Speak("Bonjour et bienvenue sur Performance Académique.")
$synth.Dispose()
Write-Host "Success generating test_voice.wav"
