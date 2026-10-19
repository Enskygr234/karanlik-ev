# `npx cap add android` sonrası Android projesini oyuna göre ayarlar:
# yatay ekran, tam ekran, titreşim izni ve uygulama simgesi.
import re, shutil, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
app = root / "android" / "app" / "src" / "main"

m = app / "AndroidManifest.xml"
s = m.read_text()
if "screenOrientation" not in s:
    s = s.replace("<activity", '<activity\n            android:screenOrientation="sensorLandscape"', 1)
if "android.permission.VIBRATE" not in s:
    s = s.replace("</manifest>", '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>')
m.write_text(s)

st = app / "res" / "values" / "styles.xml"
s = st.read_text()
full = ('<item name="android:windowFullscreen">true</item>'
        '<item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>')
s = re.sub(r'(<style name="AppTheme.NoActionBar"[^>]*>)', r'\1' + full, s)
s = re.sub(r'(<style name="AppTheme.NoActionBarLaunch"[^>]*>)', r'\1' + full, s)
st.write_text(s)

icons = root / "android-icons"
for d in ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]:
    dst = app / "res" / f"mipmap-{d}"
    if dst.exists():
        for name in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
            shutil.copy(icons / f"ic_launcher-{d}.png", dst / name)
shutil.rmtree(app / "res" / "mipmap-anydpi-v26", ignore_errors=True)
print("Android projesi ayarlandı")
