Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Hortense Desktop")

$voiceoverDir = Join-Path $PSScriptRoot "work\voiceovers"
if (!(Test-Path $voiceoverDir)) {
    New-Item -ItemType Directory -Force -Path $voiceoverDir
}

$lines = @{
    "02_dashboard.wav" = "Performance Académique réunit tous les outils essentiels de l’apprentissage dans une seule plateforme."
    "03_catalog.wav" = "Des formations structurées et accessibles."
    "04_content.wav" = "Vidéos, documents et ressources pédagogiques sont organisés pour offrir une expérience d’apprentissage claire et continue."
    "05_progression.wav" = "Chaque étudiant peut suivre son avancement et reprendre son apprentissage là où il s’est arrêté."
    "06_live.wav" = "Les sessions en direct rapprochent les professeurs et les étudiants, où qu’ils soient."
    "07_professor.wav" = "Les professeurs disposent d’un espace complet pour organiser, publier et accompagner leurs étudiants."
    "08_conclusion.wav" = "Performance Académique. Transformez votre manière d’apprendre et d’enseigner."
}

foreach ($item in $lines.GetEnumerator()) {
    $dest = Join-Path $voiceoverDir $item.Key
    Write-Host "Synthesizing $($item.Key) ('$($item.Value)')"
    $synth.SetOutputToWaveFile($dest)
    $synth.Speak($item.Value)
}

$synth.Dispose()
Write-Host "All SAPI voiceovers generated in: $voiceoverDir"
