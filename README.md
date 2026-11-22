# YKS Haftalık Takip

**YD Studios** tarafından geliştirilen, lise ve üniversite öğrencileri için haftalık çalışma, soru, deneme, konu takibi ve motivasyon uygulaması. Tamamen istemci taraflı çalışır (localStorage), PWA olarak kurulabilir ve opsiyonel **canlı sınıf ligi** backend'i ile gelir.

> Ana sayfa: `index.html` (YD Studios landing) · Uygulama: `app.html` · API: `api/league.js`

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji](#teknoloji)
- [Proje Yapısı](#proje-yapısı)
- [Yerel Geliştirme](#yerel-geliştirme)
- [Canlı Sınıf Ligi (Backend)](#canlı-sınıf-ligi-backend)
- [Vercel'e Dağıtım](#vercele-dağıtım)
- [Token ile GitHub Deposu Oluşturma](#token-ile-github-deposu-oluşturma)
- [Veri ve Gizlilik](#veri-ve-gizlilik)
- [PWA / Çevrimdışı](#pwa--çevrimdışı)
- [Tasarım](#tasarım)
- [Yol Haritası](#yol-haritası)
- [Lisans](#lisans)

---

## Özellikler

| Modül | Açıklama |
|---|---|
| **Haftalık Program** | Gün gün blok ekleme; saat aralığı, hedef soru, süre; sıralama, kopyalama, hafta temizleme, yeni haftaya geçme (arşiv). |
| **Soru Takibi** | Ders + konu + çözülen/doğru/yanlış; net, başarı oranı, ders dağılımı; kayıt düzenleme/silme ve dönem/ders filtreleri. |
| **Deneme Analizi** | TYT/AYT denemeleri; ders bazlı D/Y/B, net, sıralama, tür filtresi, net ve sıralama trendi, yanlış konu etiketleme. |
| **Konu Matrisi** | 9–12. sınıf, TYT/AYT, Üniversite ve Maarif 1./2. Aşama; 4 durumlu konu takibi, tekrar tarihi ve çalışma süresi; Eski ↔ Maarif müfredat seçimi. |
| **Odak Sayacı** | 25/30/40 dk ve özel süre; başlat/duraklat/sıfırla; bitişte ses + görsel uyarı; blok bağlama. |
| **Motivasyon** | XP, 9 kademeli özelleştirilebilir rütbe, günlük/haftalık görevler, seri bonusu, aktivite ısı haritası. |
| **Sınıf Ligi** | Kullanıcı adı + sınıf; XP sıralaması. Canlı mod (Vercel API + Redis) veya yerel mod + JSON ile rakip ekleme. |
| **Kaynak Takibi** | Kitap/kaynak, sayfa/test ilerlemesi, günlük hedef ve seri. |
| **Hafif Mod** | Zor günlerde hedefi “1 mini blok + 10 soru”ya indirir; görev hedefleri de düşer. |
| **Ayarlar** | Font (Super Melon Hunter dahil), tema, geri sayım, dersler, rütbe isimleri, otomatik yedek, JSON dışa/içe aktarma. |
| **PWA** | Kurulabilir, çevrimdışı çalışır (service worker), ana ekrana eklenebilir. |

---

## Teknoloji

- **Arayüz:** Vanilla HTML5 + CSS3 (saf, build yok) + ES Modules JavaScript (JSDoc tipleri)
- **Grafikler:** Bağımlılıksız, elle yazılmış SVG (çizgi, bar, donut, ısı haritası)
- **Veri:** `localStorage` (tek anahtar, sürümlü şema + otomatik yedek)
- **Backend (opsiyonel):** Vercel Serverless Function (`api/league.js`), Redis (Upstash / Vercel KV) REST üzerinden — **sıfır npm bağımlılığı**
- **PWA:** `manifest.json` + service worker (önce ağ, çevrimdışında önbellek)
- **Dağıtım:** Vercel (statik + `/api` fonksiyonu)

> Yerel geliştirme için Node.js gerekmez. Backend'i yerelde çalıştırmak isterseniz Vercel CLI (`vercel dev`) kullanın.

---

## Proje Yapısı

```
.
├── index.html              # YD Studios landing (tanıtım + giriş)
├── app.html                # Asıl uygulama (sekmeler)
├── manifest.json           # PWA manifest (start_url: app.html)
├── sw.js                   # Service worker (offline + önbellek)
├── api/
│   └── league.js           # Canlı lig API (GET/POST, Redis REST)
├── css/
│   └── styles.css          # Playful Geometric tema (açık)
├── js/
│   ├── app.js              # Boot, sekmeler, I/O, PWA, quest değerlendirme
│   ├── store.js            # localStorage şeması, işlemler, istatistik, lig verisi
│   ├── ui.js               # DOM yardımcıları, modal, toast
│   ├── charts.js           # SVG grafikler
│   ├── schedule.js         # Haftalık program
│   ├── pomodoro.js         # Odak sayacı
│   ├── questions.js        # Soru takibi
│   ├── exams.js            # Deneme analizi
│   ├── curriculum.js       # Konu matrisi
│   ├── curriculumData.js   # Hazır müfredat listeleri
│   ├── resources.js        # Kaynak takibi
│   ├── notes.js            # Eksik konular & notlar
│   ├── quests.js           # Görev motoru
│   ├── league.js           # Profil + sınıf ligi (canlı/yerel)
│   ├── dashboard.js        # Özet, rütbe, grafikler
│   └── settings.js         # Ayarlar, font, rütbe, dersler
├── assets/
│   ├── bg-playful.svg      # Arka plan deseni
│   ├── ydlogo.png          # YD Studios logosu
│   ├── icon.svg / *.png    # PWA ikonları
│   └── fonts/
│       └── SuperMelonHunter.otf
├── deploy-github.sh        # Token ile repo oluştur + push
├── .env.example            # KV/Upstash env örneği
└── README.md
```

---

## Yerel Geliştirme

ES modüller `file://` ile çalışmaz; küçük bir statik sunucu kullanın:

```bash
cd daily
python3 -m http.server 8000
```

- Landing: <http://localhost:8000>
- Uygulama: <http://localhost:8000/app.html>
- Telefon (aynı Wi-Fi): `http://<yerel-ip>:8000`

> `python3 -m http.server` API'yi çalıştırmaz; lig ekranı otomatik olarak **yerel moda** düşer. Canlı lig için Vercel ortamı gerekir.

---

## Canlı Sınıf Ligi (Backend)

Kullanıcı adı + sınıf bazında XP sıralaması. Veri Redis'te sınıf başına **sorted set** olarak tutulur (`yks:league:<sınıf>`), XP yalnızca artırılır.

### API

**`GET /api/league?class=11.%20S%C4%B1n%C4%B1f`**

```json
{
  "ok": true,
  "className": "11. Sınıf",
  "players": [
    { "name": "Zeynep", "xp": 9999 },
    { "name": "Ayaz", "xp": 1200 }
  ],
  "count": 2
}
```

**`POST /api/league`**

```json
{ "username": "Ayaz", "className": "11. Sınıf", "xp": 1200 }
```

- `xp` yalnızca mevcut değerden büyükse yazılır (düşürülemez).
- Başarılı yanıt güncel sıralamayı döndürür.

**Hata kodları:** `400 INVALID_CLASS / INVALID_USERNAME / INVALID_BODY`, `405 METHOD_NOT_ALLOWED`, `503 KV_NOT_CONFIGURED`, `500 SERVER_ERROR`.

### Ortam değişkenleri

Vercel → **Storage → Upstash Redis (veya KV)** eklendiğinde otomatik gelir. API iki isim setini de destekler:

| Öncelik | URL | Token |
|---|---|---|
| 1 | `KV_REST_API_URL` | `KV_REST_API_TOKEN` |
| 2 | `UPSTASH_REDIS_REST_URL` | `UPSTASH_REDIS_REST_TOKEN` |

Değişkenler yoksa API `503` döner; istemci sessizce **yerel lige** geçer (uygulama bozulmaz).

### Güvenlik notu

Şu an kimlik doğrulama yok; istemci kendi XP'sini bildirir. Rekabet bütünlüğü kritikse ileride:
- kullanıcı hesabı + oturum (Auth),
- sunucu tarafı XP doğrulama / imzalı olaylar,
- hız sınırlama (rate limit) eklenmelidir.

---

## Vercel'e Dağıtım

1. Depoyu GitHub'a gönderin (aşağıdaki script veya normal `git push`).
2. <https://vercel.com/new> → **Import Git Repository**.
3. Ayarlar:
   - **Framework Preset:** Other
   - **Build Command:** boş
   - **Output Directory:** `./`
4. **Storage → Marketplace → Upstash Redis** (veya KV) ekleyin; env otomatik bağlanır.
5. **Deploy**.

Dağıtım sonrası:
- `/` → landing, `/app.html` → uygulama, `/api/league` → canlı lig.
- Lig ekranındaki durum rozeti **● Canlı** olur (env doğruysa).

### `vercel.json` gerekir mi?

Hayır. Statik dosyalar kökte, serverless fonksiyon `api/` altında otomatik algılanır.

---

## Token ile GitHub Deposu Oluşturma

Şifre/2FA ile uğraşmadan, **Personal Access Token** kullanarak kendi hesabınızda depo açıp push eden script:

```bash
chmod +x deploy-github.sh
GH_TOKEN=ghp_xxxxxxxxxxxxxxxx ./deploy-github.sh yks-haftalik-takip
# veya token sorulsun:
./deploy-github.sh
```

- Token'ı **`.git/config`'e yazmaz**; push sırasında tek seferlik `http.extraheader` kullanır.
- Depo yoksa `POST /user/repos` ile oluşturur, varsa devam eder.
- Varsayılan branch: `main`.
- Özel depo için: `REPO_PRIVATE=1 ./deploy-github.sh`
- Uygun token izinleri: **Contents: Read/Write**, **Metadata: Read**, repo oluşturma (classic: `repo`).

Script sonunda Vercel adımlarını ve gerekli env değişkenlerini yazdırır.

---

## Veri ve Gizlilik

- Tüm kişisel veriler (program, sorular, denemeler, notlar, XP) **tarayıcının `localStorage`'ında** tutulur; sunucuya gitmez.
- Canlı lige katılırsanız yalnızca **kullanıcı adı, sınıf ve XP** Redis'e yazılır.
- Cihaz değiştirmek için **Ayarlar → Dışa/İçe Aktar (JSON)** kullanın.
- "Yeni Haftaya Geç" otomatik JSON yedeği indirir (kapatılabilir).

---

## PWA / Çevrimdışı

- `manifest.json` + service worker ile kurulabilir.
- Strateji: **önce ağ** (güncel kod), çevrimdışında önbellek. `/api/*` istekleri önbelleğe alınmaz.
- HTTPS (Vercel) veya `localhost` gerekir; `file://` altında service worker devre dışıdır.

---

## Tasarım

- **Playful Geometric / warm pastel** açık tema: krem zemin, mor/pembe/amber/mint vurgular, kalın kenarlar, sert (blursuz) gölgeler.
- Landing: “YD Studios” kimliği, yüzen blob'lar, marquee, bento istatistik kartları, hard-offset butonlar.
- Başlıklar **Outfit**, gövde **Plus Jakarta Sans** (Google Fonts; çevrimdışında sistem fontuna düşer).
- **Super Melon Hunter** (`assets/fonts/SuperMelonHunter.otf`) Ayarlar → Görünüm'den seçilebilir.
- `prefers-reduced-motion` desteklenir.

---

## Yol Haritası

- [ ] Canlı ligde kimlik doğrulama ve sunucu tarafı XP doğrulama
- [ ] Haftalık/aylık lig sezonları ve rozetler
- [ ] Denemede konu bazlı otomatik zayıf konu önerisi
- [ ] Bulut yedekleme (opsiyonel hesap)
- [ ] Çoklu dil (EN/TR)

---

## Lisans

Bu proje kişisel kullanım için geliştirilmiştir. Ticari kullanım veya yeniden dağıtım için iletişime geçin.
Super Melon Hunter fontu kendi lisansına tabidir.