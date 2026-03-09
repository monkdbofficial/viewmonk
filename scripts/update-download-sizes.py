#!/usr/bin/env python3
"""
Called by build-standalone.yml after zips are created.
Usage: python3 scripts/update-download-sizes.py <lite_mb> <full_mb> <version>
Updates file sizes and version in download-page.html automatically.
"""
import re, sys

lite      = sys.argv[1]   # e.g. "12"
full      = sys.argv[2]   # e.g. "390"
version   = sys.argv[3]   # e.g. "1.1.0"
lite_disk = str(int(lite) + 420)
full_disk = str(int(full) + 260)

html = open('download-page.html').read()

# ── 1. Version chip ───────────────────────────────────────────────────────────
html = re.sub(r'v\d+\.\d+(?:\.\d+)? Stable', f'v{version} Stable', html)

# ── 2. Exact spec values (no ~): "Without deps" → LITE, "Deps included" → FULL
def replace_exact(label, new_val, text):
    return re.sub(
        rf'(\d+)( MB</div><div class="dl-spec-sub">{re.escape(label)})',
        lambda m: f'{new_val}{m.group(2)}',
        text
    )
html = replace_exact('Without deps',  lite, html)
html = replace_exact('Deps included', full, html)

# ── 3. All ~X MB badges / buttons / text (>100 → FULL, else → LITE) ──────────
html = re.sub(r'~(\d+) MB', lambda m: f'~{full} MB' if int(m.group(1)) > 100 else f'~{lite} MB', html)

# ── 4. Disk values — must run AFTER step 3 so they override the generic pass ──
def replace_tilde_exact(label, new_val, text):
    return re.sub(
        rf'(~)\d+( MB</div><div class="dl-spec-sub">{re.escape(label)})',
        lambda m: f'~{new_val}{m.group(2)}',
        text
    )
html = replace_tilde_exact('After install', lite_disk, html)
html = replace_tilde_exact('Extracted',     full_disk, html)

# ── 5. Compare table rows ─────────────────────────────────────────────────────
# "Download size" row
html = re.sub(
    r'(>Download size<[^~]*~)\d+( MB</span>[^~]*~)\d+( MB</span>)',
    lambda m: f'{m.group(1)}{lite}{m.group(2)}{full}{m.group(3)}',
    html, flags=re.DOTALL
)
# "Disk after install" row
html = re.sub(
    r'(>Disk after install<[^~]*~)\d+( MB</span>[^~]*~)\d+( MB</span>)',
    lambda m: f'{m.group(1)}{lite_disk}{m.group(2)}{full_disk}{m.group(3)}',
    html, flags=re.DOTALL
)

open('download-page.html', 'w').write(html)
print(f'✅ LITE={lite}MB  FULL={full}MB  disk={lite_disk}/{full_disk}MB  v{version}')
