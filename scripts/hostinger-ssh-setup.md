# Accès SSH pour diagnostic automatisé (une fois)

Clé publique à ajouter dans **hPanel → axelmond.com → Advanced → SSH Access → SSH keys → Add** :

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIp42DJK0uBTLyr7+9AgnzEBFUUlupf58O3O/Qtsj39w saadgmih@saadmsi
```

Puis dans **GitHub → repo Axelmond → Settings → Secrets → Actions**, ajouter :

| Secret | Valeur |
|--------|--------|
| `HOSTINGER_SSH_HOST` | `82.198.227.4` |
| `HOSTINGER_SSH_PORT` | `65002` |
| `HOSTINGER_SSH_USER` | `u425027223` |
| `HOSTINGER_SSH_KEY` | contenu de `~/.ssh/id_ed25519_axelmond_ci` (clé privée générée pour CI) |

Lancer : **Actions → Hostinger diagnose → Run workflow**.
