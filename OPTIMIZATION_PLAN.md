# Plan d'Optimisation STT Gemini - Objectif < 1 seconde

## 📊 Analyse du Pipeline Actuel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Utilisateur relâche bouton                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. stop_recording() - Finalise WAV                              ~50-100ms   │
│ 2. Création tokio::Runtime                                      ~10-50ms    │
│ 3. Lecture fichier WAV depuis disque                            ~5-20ms     │
│ 4. Encodage Base64                                              ~5-15ms     │
│ 5. Requête HTTP Gemini (upload + processing + download)         ~800-2000ms │
│ 6. Parsing JSON response                                        ~1-5ms      │
│ 7. Dictionary/Rules                                             ~1-5ms      │
│ 8. Stats/History (bloquant)                                     ~10-30ms    │
├─────────────────────────────────────────────────────────────────────────────┤
│ TOTAL ESTIMÉ                                                    ~900-2200ms │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Objectif

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Latence totale | 1-2.5s | < 1s |
| Taille audio 5s | ~480KB (WAV 48kHz) | ~30KB (OGG/FLAC) |
| Connexion HTTP | Nouvelle à chaque fois | Réutilisée |

---

## 🚀 Phase 1: Optimisations Critiques (Impact: -500ms)

### 1.1 Runtime Tokio Partagé
**Problème**: Création d'un nouveau runtime à chaque transcription (~50ms)
```rust
// AVANT (pipeline.rs:50-52)
let rt = tokio::runtime::Runtime::new()?;
rt.block_on(transcribe_with_cloud(...))

// APRÈS: Runtime global partagé
static RUNTIME: Lazy<Runtime> = Lazy::new(|| {
    Runtime::new().expect("Failed to create runtime")
});
```
**Gain**: ~50ms

### 1.2 Compression Audio (WAV → OGG Opus)
**Problème**: WAV non compressé = fichier volumineux = upload lent
```
5 secondes audio:
- WAV 48kHz stereo 16-bit: 960 KB
- WAV 16kHz mono 16-bit: 160 KB  
- OGG Opus 16kHz mono: ~15-25 KB (compression 10-15x)
```
**Gain**: ~200-400ms (selon connexion)

### 1.3 Enregistrement Direct 16kHz Mono
**Problème**: Resampling après enregistrement
```rust
// Forcer 16kHz mono dès l'enregistrement
let spec = WavSpec {
    channels: 1,
    sample_rate: 16000,  // Au lieu de config.sample_rate()
    bits_per_sample: 16,
    sample_format: hound::SampleFormat::Int,
};
```
**Gain**: ~10-20ms (supprime resampling)

### 1.4 Stats/History en Background
**Problème**: Bloque le retour de la transcription
```rust
// APRÈS: Thread séparé
tokio::spawn(async move {
    let _ = save_stats_and_history(&app, &file_path, &text);
});
```
**Gain**: ~20-30ms

---

## 🔧 Phase 2: Optimisations Réseau (Impact: -200ms)

### 2.1 Pré-chauffage Connexion au Démarrage
```rust
// Au démarrage de l'app, ping l'API pour établir la connexion TLS
pub async fn warmup_gemini_connection(config: &STTProviderConfig) {
    let _ = HTTP_CLIENT
        .head(&format!("{}/models", config.base_url))
        .send()
        .await;
}
```
**Gain**: ~100-200ms (sur première requête)

### 2.2 HTTP/2 Multiplexing (déjà activé par défaut avec reqwest)
✅ Déjà implémenté avec le client optimisé

---

## ⚡ Phase 3: Optimisations Avancées (Impact: -300ms)

### 3.1 Buffer Audio en Mémoire (Pas de Disque)
```rust
// Garder l'audio en RAM au lieu d'écrire sur disque
pub struct AudioRecorder {
    buffer: Arc<Mutex<Vec<i16>>>,  // Au lieu de WavWriter<File>
}
```
**Gain**: ~30-50ms

### 3.2 Streaming API Gemini (Transcription Pendant Enregistrement)
```
┌──────────────────────────────────────────────────────────┐
│ ACTUEL: Séquentiel                                       │
│ [Enregistrement 5s] → [Upload] → [Process] → [Response]  │
│                       ├─────────── 1.5s ──────────────┤  │
├──────────────────────────────────────────────────────────┤
│ OPTIMISÉ: Streaming                                      │
│ [Enregistrement 5s]                                      │
│      ├─[Chunk 1]→[API]                                   │
│      ├─[Chunk 2]→[API]                                   │
│      └─[Chunk 3]→[API]→[Response partielle]              │
│                    ├── ~500ms ──┤                        │
└──────────────────────────────────────────────────────────┘
```
**Gain**: ~200-500ms (transcription commence pendant l'enregistrement)

### 3.3 Utiliser l'API Live de Gemini (WebSocket)
```
Gemini Live API: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
- Connexion persistante WebSocket
- Streaming bidirectionnel
- Latence ultra-basse (~100-300ms)
```

---

## 📋 Plan d'Implémentation

| Phase | Tâche | Priorité | Complexité | Gain Estimé |
|-------|-------|----------|------------|-------------|
| 1.1 | Runtime Tokio partagé | 🔴 Haute | Facile | 50ms |
| 1.2 | Compression OGG Opus | 🔴 Haute | Moyenne | 200-400ms |
| 1.3 | Enregistrement 16kHz | 🔴 Haute | Facile | 20ms |
| 1.4 | Stats async | 🟡 Moyenne | Facile | 30ms |
| 2.1 | Warmup connexion | 🟡 Moyenne | Facile | 100ms |
| 3.1 | Buffer mémoire | 🟡 Moyenne | Moyenne | 50ms |
| 3.2 | Streaming chunks | 🟢 Basse | Difficile | 300ms |
| 3.3 | WebSocket Live API | 🟢 Basse | Difficile | 500ms |

---

## 🛠️ Dépendances Requises

```toml
# Cargo.toml - Nouvelles dépendances
ogg = "0.9"           # Encodage OGG
opus = "0.3"          # Codec Opus (compression audio)
# OU
audiopus = "0.3"      # Alternative pour Opus
```

---

## 📈 Résultats Attendus

| Scénario | Avant | Après Phase 1 | Après Phase 2 | Après Phase 3 |
|----------|-------|---------------|---------------|---------------|
| Audio 3s, bonne connexion | 1.2s | 0.8s | 0.7s | 0.4s |
| Audio 5s, bonne connexion | 1.5s | 0.9s | 0.8s | 0.5s |
| Audio 10s, bonne connexion | 2.5s | 1.2s | 1.0s | 0.6s |

---

## ⚠️ Limitations Incompressibles

1. **Latence réseau minimum**: ~50-100ms (RTT vers serveurs Google)
2. **Temps de traitement Gemini**: ~200-400ms (incompressible côté serveur)
3. **Latence totale théorique minimum**: ~300-500ms

> **Note**: Atteindre < 500ms de manière constante nécessite l'API WebSocket Live de Gemini (Phase 3.3).

---

## 🎬 Recommandation pour Production

**Approche recommandée**: Implémenter Phase 1 + Phase 2.1

Cela devrait permettre d'atteindre **~700-900ms** de latence de manière fiable, ce qui est perçu comme "instantané" par les utilisateurs.

Pour atteindre **< 500ms**, l'API WebSocket Live de Gemini est nécessaire mais augmente significativement la complexité.
