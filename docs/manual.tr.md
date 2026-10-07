# Countree Kullanım Kılavuzu

[English](manual.en.md) | **Türkçe**

Countree, canlı bir uydu haritası üzerine coğrafi nokta (örneğin ağaç) yerleştirmek, saymak ve düzenlemek için kullanılan tek sayfalık bir web uygulamasıdır. Tamamen tarayıcınızda çalışır: kurulum, sunucu veya hesap gerekmez. Bu kılavuzdaki ekran görüntüleri, `data/20260930-jupiter-ciftlik-03.csv` örnek dosyasıyla (13 alanda 9.622 ağaç) alınmıştır.

## İçindekiler

1. [Başlarken](#1-başlarken)
2. [Ekrana genel bakış](#2-ekrana-genel-bakış)
3. [Nokta ekleme ve yönetme](#3-nokta-ekleme-ve-yönetme)
4. [Alanlar (gruplar)](#4-alanlar-gruplar)
5. [Ağaç istatistikleri ve grup listesi](#5-ağaç-istatistikleri-ve-grup-listesi)
6. [Yakın nokta filtresi](#6-yakın-nokta-filtresi)
7. [Uydu sağlayıcıları ve görüntü tarihi](#7-uydu-sağlayıcıları-ve-görüntü-tarihi)
8. [CSV dosyasını kaydetme ve yükleme](#8-csv-dosyasını-kaydetme-ve-yükleme)
9. [Klavye kısayolları](#9-klavye-kısayolları)
10. [Sorun giderme](#10-sorun-giderme)

> **Not:** Uygulamanın arayüzü İngilizcedir. Bu kılavuzda düğme adları arayüzde göründüğü gibi İngilizce yazılmış, gerektiğinde Türkçe karşılığı verilmiştir.

---

## 1. Başlarken

1. `index.html` dosyasını güncel bir tarayıcıda açın (çift tıklayın veya `open index.html` komutunu çalıştırın). Harita kütüphanesi ve uydu görüntüleri internetten yüklendiği için internet bağlantısı gerekir.
2. Harita, nokta koymaya hazır şekilde **Add Mode** (Ekleme Modu) ile açılır.
3. Mevcut verilerle başlamak için **Load CSV** düğmesine tıklayıp bir dosya seçin ([8. bölüm](#8-csv-dosyasını-kaydetme-ve-yükleme)).

![Countree açılış ekranı](images/01-empty.png)

### API anahtarları (isteğe bağlı)

Varsayılan sağlayıcılar olan *Google (no key)* ve *ESRI World Imagery (no key)* için ayar gerekmez. Mapbox, Google Maps API ve HERE Maps için anahtar gerekir:

1. `config.example.js` dosyasını `config.js` adıyla kopyalayın.
2. Anahtarlarınızı yazın:

   ```js
   window.COUNTREE_CONFIG = {
     mapbox_key : 'pk.eyJ1IjoiYW...',
     google_key : 'AIzaSy...',
     here_key   : 'your-here-api-key',
   };
   ```

3. Sayfayı yenileyin ve **Satellite** açılır listesinden sağlayıcıyı seçin.

`config.js` git tarafından yok sayılır; anahtarlarınız yalnızca kendi bilgisayarınızda kalır.

## 2. Ekrana genel bakış

![Örnek dosya yüklenmiş Countree](images/02-overview.png)

Pencere üç bölümden oluşur: üstte **araç çubuğu**, solda **harita**, sağda **nokta tablosu**. Üzerinde sayı olan turuncu, sarı veya yeşil daireler *kümelerdir*: yakın noktaları birleştirerek haritanın okunabilir kalmasını sağlar. Tek tek işaretçileri görmek için yakınlaştırın.

### Araç çubuğu

![Araç çubuğu](images/03-toolbar.png)

| Kontrol | Ne yapar |
|---|---|
| **+ Add Mode / ✥ Pan Mode** | Tıklayınca nokta koyma (Add) ile yalnızca haritayı gezme (Pan) arasında geçiş yapar. |
| **▱ Draw Area** | Alan çizmeyi başlatır ([4. bölüm](#4-alanlar-gruplar)). |
| **Save CSV** | Tüm nokta ve alanları `countree_points.csv` olarak indirir. |
| **Load CSV** | Mevcut verinin yerine bir CSV dosyasını yükler. |
| **Group** listesi | Yalnızca seçilen grubun noktalarını gösterir ve alanını vurgular. |
| **☰ Groups** | Alan, ağaç sayısı ve yoğunluğu gösteren grup listesini açar. |
| **Stats view** | İşaretçilerin yerine her grup için bir özet etiketi gösterir. |
| **Close points** + kaydırıcı | Seçilen mesafe içinde komşusu olan noktaları gösterir. |
| **Satellite** listesi | Uydu görüntüsü sağlayıcısını seçer. |

### Nokta tablosu

![Nokta tablosu](images/04-sidebar.png)

Sağdaki tablo her noktayı numarası, açıklaması, enlemi, boylamı ve ait olduğu gruplarla listeler. **POINTS** yanındaki sayı toplam nokta sayısıdır (filtre açıkken `gösterilen / toplam`). Tablo sanallaştırılmıştır; on binlerce satır olsa bile akıcı kayar.

## 3. Nokta ekleme ve yönetme

### Nokta ekleme

**Add Mode** açıkken (kırmızı düğme) haritanın herhangi bir yerine tıklayın. İşaretçi konur ve tabloya bir satır eklenir.

İsimler otomatik verilir. İlk nokta `Point 1` olur; sonrasında *son* noktanın adı şablon alınır ve sondaki sayı bir artırılır. Son noktanız `Tree 7` ise sonraki `Tree 8` olur. Ön eki değiştirmek için bir noktayı yeniden adlandırın (örneğin `Olive 1`); sonraki noktalar `Olive 2`, `Olive 3` … diye devam eder.

### Noktayı yeniden adlandırma

Tablodaki açıklamaya tıklayın, yeni adı yazın ve **Enter**'a basın (veya başka bir yere tıklayın). Boş ad dikkate alınmaz.

### Noktayı inceleme

Tablodaki bir satıra tıklayın. Harita noktaya yaklaşır (en az 14. yakınlaştırma düzeyi) ve ad, koordinat ve silme düğmesini içeren balon açılır. İşaretçiye doğrudan da tıklayabilirsiniz.

![Nokta balonu](images/09-point-popup.png)

### Nokta silme

Satırın sonundaki **✕** işaretine tıklayın veya işaretçiye tıklayıp balondaki **Delete point** düğmesini kullanın. Silme anında gerçekleşir ve geri alınamaz; emin değilseniz önce CSV kaydedin.

> **İpucu:** Yalnızca haritada gezinmek istiyorsanız yanlışlıkla nokta koymamak için **Pan Mode**'a geçin.

## 4. Alanlar (gruplar)

*Alan* (diğer adıyla *grup*), örneğin bir bahçeyi veya tarlayı temsil eden çokgendir. Çokgenin içindeki her nokta otomatik olarak o gruba ait olur. Bir nokta birden fazla gruba ait olabilir ve alanlar üst üste binebilir. Üyelik çokgenden **hesaplanır**, dosyada saklanmaz; bu yüzden bir köşeyi taşıdığınızda veya yeni nokta eklediğinizde kendiliğinden güncellenir.

### Alan çizme

1. **▱ Draw Area** düğmesine tıklayın. Düğme kırmızıya döner.
2. Köşeleri koymak için haritaya tıklayın. İmlecinizi kesikli bir çizgi izler.
3. En az üç köşeden sonra şekli kapatmak için **ilk köşeye** (büyük daire) tıklayın.
4. Açılan balona bir ad yazıp **Enter**'a basın veya **Save**'e tıklayın. **Cancel** veya **Esc** şekli iptal eder. Adı boş bırakırsanız `Group 1`, `Group 2` … olarak adlandırılır.

![Alan çizimi](images/12-draw-area.png)

![Yeni alanı adlandırma](images/13-name-area.png)

### Mevcut bir alanla çalışma

Balonunu açmak için haritada alana tıklayın.

![Grup balonu](images/10-group-popup.png)

- **Ad alanı** – adı düzenleyip Enter'a basın.
- **Highlight** (Vurgula) – yalnızca bu grubun noktalarını gösterir, diğer alanları soluklaştırır. Düğme sonra **Show all** (Tümünü göster) olur.
- **Edit shape** (Şekli düzenle) – köşe tutamaçlarını sürükleyerek alanı yeniden şekillendirin. Bitince **Done**'a tıklayın veya **Esc**'ye basın.
- **Delete** (Sil) – alanı siler (noktalar kalır).

![Alan şeklini düzenleme](images/11-edit-shape.png)

### Gruba göre filtreleme

Araç çubuğundaki **Group** listesinden bir grup seçin. Harita gruba yaklaşır, noktaları vurgulanır ve tablo yalnızca üyeleri listeler (`376 / 9622`). Geri dönmek için **All groups** seçin.

![Vurgulanmış bir grup](images/05-group-highlight.png)

## 5. Ağaç istatistikleri ve grup listesi

### Grup listesi

Tüm alanların tablosunu açmak için **☰ Groups** düğmesine tıklayın.

![Grup listesi](images/06-group-list.png)

| Sütun | Anlamı |
|---|---|
| Name | Grup adı. |
| Points | Alanın içindeki nokta sayısı. |
| Area (dönüm) | Çokgenin dönüm cinsinden alanı (1 dönüm = 1.000 m²). |
| Trees/dönüm | Nokta sayısının alana bölümü: dikim yoğunluğu. |
| Description | Her grup için yazabileceğiniz serbest not. CSV dosyasına kaydedilir. |

Pencereyi **×**, **Esc** veya pencerenin dışına tıklayarak kapatın.

### İstatistik görünümü

Tek tek işaretçileri gizleyip her grup için ağaç sayısı, alan ve yoğunluk içeren bir etiket görmek için **Stats view** kutusunu işaretleyin.

![İstatistik görünümü](images/07-stats-view.png)

Stats view **kapalıyken** de sayılı bir kümenin üzerine gelebilirsiniz: bir ipucu kutusu nokta sayısını, kümedeki noktaların dış bükey zarfının (convex hull) alanını ve yoğunluğu gösterir.

## 6. Yakın nokta filtresi

Çift kayıtları veya birbirine fazla yakın dikilmiş ağaçları bulmak için kullanın.

1. **Close points** kutusunu işaretleyin.
2. Kaydırıcıyı ayarlayın (0,1 – 20 m, varsayılan 1,0 m).
3. Harita ve tablo artık yalnızca **bu mesafe içinde başka bir noktası olan** noktaları gösterir. Sayaç `gösterilen / toplam` biçimindedir.

![4 m'de yakın nokta filtresi](images/08-close-points.png)

Tek bir alanı denetlemek için **Group** listesiyle birlikte kullanabilirsiniz. Her şeyi yeniden görmek için kutunun işaretini kaldırın.

## 7. Uydu sağlayıcıları ve görüntü tarihi

**Satellite** açılır listesinden bir sağlayıcı seçin.

| Sağlayıcı | Anahtar gerekli mi | Notlar |
|---|---|---|
| Google (no key) | Hayır | Varsayılan; çok ayrıntılı, resmî olmayan kaynak, garanti yok. |
| ESRI World Imagery (no key) | Hayır | Görüntü tarihi rozetini gösterir. |
| Mapbox | Evet | [Anahtar alın](https://account.mapbox.com/access-tokens/) |
| Google Maps API | Evet | [Maps JavaScript API'yi etkinleştirin](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com) |
| HERE Maps | Evet | [API anahtarı alın](https://platform.here.com/portal/) |

Anahtarı `config.js` içinde olmayan bir sağlayıcıyı seçerseniz bir mesaj anahtarı eklemenizi söyler ve harita önceki görüntüde kalır. Anahtar tanımlıysa listenin yanındaki alanda `(set in config.js)` yazar.

### Görüntü tarihi

ESRI seçiliyken sağ alt köşedeki rozet, görünümdeki uydu görüntüsünün yaklaşık çekim tarihini gösterir. Haritayı oynatmayı bıraktıktan yaklaşık bir saniye sonra güncellenir. ESRI o konum için veri bulamazsa veya ulaşılamazsa **No date info** ya da **Unavailable** yazar.

![Tarih rozetli ESRI görüntüsü](images/14-esri-date.png)

## 8. CSV dosyasını kaydetme ve yükleme

### Kaydetme

**Save CSV** düğmesine tıklayın. Tarayıcı tüm noktaları, alanları ve grup açıklamalarını içeren `countree_points.csv` dosyasını indirir. Kaydedilecek veri yoksa bir mesaj bunu bildirir. **Countree otomatik kaydetmez**: sayfayı yenilemek kaydedilmemiş çalışmayı kaybettirir, bu yüzden düzenli kaydedin.

### Yükleme

**Load CSV** düğmesine tıklayıp bir dosya seçin. Açık veri varsa onay istenir, çünkü yükleme mevcut tüm nokta ve alanları **değiştirir**. Büyük dosyalar parça parça yüklenir, böylece tarayıcı donmaz. İşlem bitince harita yüklenen verilere sığdırılır ve nokta ile grup sayısını bildiren bir mesaj görünür.

### Dosya biçimi

```csv
type,description,latitude,longitude,vertices,group_description
point,"Tree 1",41.01234,28.97654,,
point,"Tree 2",41.01100,28.97500,,
group,"North orchard",,,"41.02 28.97;41.02 28.98;41.01 28.98;41.01 28.97","Planted 2019"
```

- `point` satırları `description`, `latitude` ve `longitude` alanlarını kullanır.
- `group` satırları `description` alanını grup adı olarak, `vertices` alanını ise `;` ile ayrılmış `enlem boylam` çiftleri olarak kullanır (en az 3). `group_description` isteğe bağlı nottur.
- Virgül veya tırnak içeren metinler çift tırnak içine alınmalıdır; içindeki tırnak `""` olarak yazılır.
- Eski 3 sütunlu dosyalar (`description,latitude,longitude`) ve `group_description` sütunu olmayan dosyalar da yüklenir.
- Grup üyeliği dosyada hiçbir zaman saklanmaz.

Sık görülen hatalar: *Invalid header*, *Invalid row at line N*, *Invalid coordinates at line N*, *Invalid area at line N*. Satır numarası CSV'deki sorunu gösterir.

## 9. Klavye kısayolları

| Tuş | İşlev |
|---|---|
| **Esc** | Çizilmekte olan alanı iptal eder, şekil düzenlemeyi bitirir, grup listesini veya ad balonunu kapatır. |
| **Enter** | Yeniden adlandırılan noktayı, grup adını veya yeni alan adını onaylar. |

## 10. Sorun giderme

| Sorun | Çözüm |
|---|---|
| Harita gri veya boş | İnternet bağlantınızı kontrol edin; görüntüler çevrimiçi yüklenir. Başka bir sağlayıcı deneyin. |
| Mapbox/Google API/HERE seçtim ama bir şey değişmedi | Anahtar eksik. [1. bölümde](#api-anahtarları-isteğe-bağlı) anlatıldığı gibi `config.js` oluşturup sayfayı yenileyin. |
| Her tıklamada nokta ekleniyor | Add Mode'dasınız. Düğme **✥ Pan Mode** yazana kadar **+ Add Mode** düğmesine tıklayın. |
| Dosya yükledim ama tablo boş | Bir filtre açık (Group veya Close points). **All groups** seçin ve **Close points** işaretini kaldırın. |
| Görüntü tarihi "No date info" diyor | ESRI'nin o konum için çekim tarihi yok. Haritayı kaydırın veya yakınlaştırın. |
| Yeniledikten sonra çalışmam kayboldu | Countree otomatik kaydetmez. Sekmeyi kapatmadan önce **Save CSV** kullanın. |
