# Karanlık Ev

Gece yarısı. Kapı arkandan kilitlendi. Bu evde senden başka biri daha var.

3D birinci şahıs korku oyunu. Karanlık bir evde sadece fenerinle dolaşıp **3 anahtarı** topla ve **çıkış kapısına** ulaş. Ev boyunca seni bir hayalet avlıyor.

![Tanıtım](trailer/kapak.jpg)

🎬 **Tanıtım videosu:** [trailer/karanlik-ev-fragman.mp4](trailer/karanlik-ev-fragman.mp4)

## İndir

Sağdaki **Releases** bölümünden en son sürümü aç, `KaranlikEv.apk` dosyasını telefona indirip kur. İlk kurulumda "bilinmeyen kaynaklara izin ver" demen gerekebilir.

## Nasıl oynanır

- **Ekranın sol tarafı:** parmağını sürükleyerek yürü
- **Ekranın sağ tarafı:** parmağını kaydırarak etrafına bak
- **KOŞ düğmesi:** koş, ama ses çıkarırsın ve hayalet duyar; nefesin de biter
- **Feneri hayalete tut:** ışıkta yavaşlar
- **Pil:** fener zamanla söner, yerdeki yeşil pilleri topla
- Her anahtar aldığında hayalet biraz daha hızlanır
- Kulaklıkla oyna: hayaletin nefesini ve adımlarını hangi yönden geldiğini duyarak takip edebilirsin, kalp atışın da o yaklaştıkça hızlanır

Bilgisayarda denemek için `www` klasörünü bir yerel sunucuyla aç (`python3 -m http.server -d www`), WASD + fare + Shift.

## Proje

- `www/` oyunun kendisi (three.js ile 3D; tüm dokular, sesler ve hayalet kodla üretiliyor)
- `.github/workflows/android.yml` her güncellemede APK'yı otomatik derler (Capacitor)
- `trailer/` tanıtım videosu ve onu üreten betikler
