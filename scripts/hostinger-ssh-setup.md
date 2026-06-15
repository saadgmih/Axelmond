# Accès SSH pour diagnostic automatisé (une fois)

Clé publique à ajouter dans **hPanel → axelmond.com → Advanced → SSH Access → SSH keys → Add** :

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKzixcT+SDXAlHRYMT6CYQ8IEqMj5U6JxXFLBuJPBY4r saadgmih@saadmsi
```

Puis dans **GitHub → repo Axelmond → Settings → Secrets → Actions**, ajouter :

| Secret | Valeur |
|--------|--------|
| `HOSTINGER_SSH_HOST` | `82.198.227.4` |
| `HOSTINGER_SSH_PORT` | `65002` |
| `HOSTINGER_SSH_USER` | `u425027223` |
| `HOSTINGER_SSH_KEY` | contenu de `~/.ssh/id_ed25519` (clé privée, machine locale) |

Lancer : **Actions → Hostinger diagnose → Run workflow**.
