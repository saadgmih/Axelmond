import os
from PIL import Image, ImageOps

logo_path = 'public/performance-logo-3d-symbol.png'
dest_dir = 'axelmond-mobile/assets'

im = Image.open(logo_path).convert('RGBA')
bbox = im.getbbox()
cropped = im.crop(bbox)
cw, ch = cropped.size

# 1. android-icon-foreground.png (1024x1024, logo in 620px safe zone)
fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
scale_fg = 620.0 / max(cw, ch)
new_w = int(cw * scale_fg)
new_h = int(ch * scale_fg)
resized_fg = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
paste_x = (1024 - new_w) // 2
paste_y = (1024 - new_h) // 2
fg.paste(resized_fg, (paste_x, paste_y), resized_fg)
fg.save(os.path.join(dest_dir, 'android-icon-foreground.png'), 'PNG')
print('Generated android-icon-foreground.png')

# 2. android-icon-background.png (1024x1024, solid dark emerald #031512)
bg = Image.new('RGBA', (1024, 1024), (3, 21, 18, 255))
bg.save(os.path.join(dest_dir, 'android-icon-background.png'), 'PNG')
print('Generated android-icon-background.png')

# 3. icon.png (1024x1024, for older Android & iOS standard icon)
icon = Image.new('RGBA', (1024, 1024), (3, 21, 18, 255))
scale_icon = 700.0 / max(cw, ch)
icon_w = int(cw * scale_icon)
icon_h = int(ch * scale_icon)
resized_icon = cropped.resize((icon_w, icon_h), Image.Resampling.LANCZOS)
paste_ix = (1024 - icon_w) // 2
paste_iy = (1024 - icon_h) // 2
icon.paste(resized_icon, (paste_ix, paste_iy), resized_icon)
icon.save(os.path.join(dest_dir, 'icon.png'), 'PNG')
print('Generated icon.png')

# 4. splash-icon.png (for splash screen)
splash = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
scale_sp = 500.0 / max(cw, ch)
sp_w = int(cw * scale_sp)
sp_h = int(ch * scale_sp)
resized_sp = cropped.resize((sp_w, sp_h), Image.Resampling.LANCZOS)
paste_sx = (1024 - sp_w) // 2
paste_sy = (1024 - sp_h) // 2
splash.paste(resized_sp, (paste_sx, paste_sy), resized_sp)
splash.save(os.path.join(dest_dir, 'splash-icon.png'), 'PNG')
print('Generated splash-icon.png')

# 5. android-icon-monochrome.png
alpha = resized_fg.split()[3]
mono_logo = Image.new('L', (new_w, new_h), 255)
mono_img = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
mono_stamp = Image.merge('RGBA', (mono_logo, mono_logo, mono_logo, alpha))
mono_img.paste(mono_stamp, (paste_x, paste_y), mono_stamp)
mono_img.save(os.path.join(dest_dir, 'android-icon-monochrome.png'), 'PNG')
print('Generated android-icon-monochrome.png')

# 6. favicon.png (192x192)
fav = icon.resize((192, 192), Image.Resampling.LANCZOS)
fav.save(os.path.join(dest_dir, 'favicon.png'), 'PNG')
print('Generated favicon.png')
