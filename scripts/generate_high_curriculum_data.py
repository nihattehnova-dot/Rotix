"""Curriculum data for grades 10-12 — imported by generate_high_curriculum_detailed.py"""


def unit(code, name, topics):
    return {"unit_code": code, "unit_name": name, "topics": topics}


def topic(name, prefix, items):
    outcomes = []
    for i, (desc, kw) in enumerate(items, 1):
        outcomes.append({"code": f"{prefix}.{i}", "description": desc, "keywords": kw})
    return {"topic_name": name, "outcomes": outcomes}


def base(grade, subject, ref, units):
    return {"grade": grade, "subject": subject, "program_ref": ref, "units": units}


GRADE_10 = {
    "math": base(10, "Matematik", "MEB Matematik Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("M.10.1", "Fonksiyonlar", [
            topic("Fonksiyon Kavramı", "M.10.1.1", [
                ("Fonksiyon tanımını kullanır; tanım ve değer kümelerini belirler.", ["fonksiyon", "tanım kümesi"]),
                ("Fonksiyon grafiklerini çizer ve yorumlar.", ["fonksiyon grafiği"]),
                ("Bileşke fonksiyon ve ters fonksiyon kavramlarını uygular.", ["bileşke", "ters fonksiyon"]),
                ("Doğrusal, parçalı ve mutlak değer fonksiyonlarını inceler.", ["doğrusal fonksiyon", "mutlak değer"]),
            ]),
        ]),
        unit("M.10.2", "Polinomlar", [
            topic("Polinom İşlemleri", "M.10.2.1", [
                ("Polinom kavramını tanır; derece ve katsayıları belirler.", ["polinom", "derece"]),
                ("Polinomlarla toplama, çıkarma ve çarpma işlemlerini yapar.", ["polinom işlem"]),
                ("Polinom bölme ve bölünebilme algoritmasını uygular.", ["polinom bölme"]),
                ("Horner yöntemi ve kalan teoremini kullanır.", ["Horner", "kalan teoremi"]),
            ]),
        ]),
        unit("M.10.3", "İkinci Dereceden Denklemler", [
            topic("Denklem Çözme", "M.10.3.1", [
                ("İkinci dereceden bir bilinmeyenli denklemleri çözüm yöntemlerini uygular.", ["ikinci derece", "denklem"]),
                ("Diskriminant kavramını kullanarak kök sayısını belirler.", ["diskriminant"]),
                ("Kökler toplamı ve çarpımı ilişkilerini uygular.", ["Vieta", "kökler"]),
                ("İkinci dereceden denklemlerle ilgili problemleri çözer.", ["problem"]),
            ]),
        ]),
        unit("M.10.4", "Dörtgenler ve Çokgenler", [
            topic("Dörtgenler", "M.10.4.1", [
                ("Paralelkenar, dikdörtgen, eşkenar dörtgen, yamuk ve deltoid özelliklerini kullanır.", ["dörtgen", "paralelkenar"]),
                ("Dörtgenlerin açı ve kenar özelliklerini ispatlar.", ["ispat"]),
            ]),
            topic("Çokgenler", "M.10.4.2", [
                ("Düzgün çokgenlerin iç ve dış açılarını hesaplar.", ["çokgen", "iç açı"]),
                ("Çokgenlerin alanını hesaplar.", ["alan"]),
            ]),
        ]),
        unit("M.10.5", "Uzay Geometri Başlangıç", [
            topic("Katı Cisimler", "M.10.5.1", [
                ("Prizma, piramit, silindir, koni ve kürenin elemanlarını tanır.", ["prizma", "piramit", "silindir"]),
                ("Katı cisimlerin yüzey alanı ve hacmini hesaplar.", ["yüzey alanı", "hacim"]),
                ("Gerçek yaşam problemlerinde hacim hesaplar.", ["hacim problemi"]),
            ]),
        ]),
    ]),
    "geometry": base(10, "Geometri", "MEB Geometri Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("GEO.10.1", "Üçgenler", [
            topic("Üçgende İleri Konular", "GEO.10.1.1", [
                ("Üçgende açıortay ve kenarortay teoremlerini uygular.", ["açıortay", "kenarortay"]),
                ("Üçgende eşlik ve benzerlik ispatları yapar.", ["eşlik ispatı"]),
                ("Üçgende alan formüllerini farklı yöntemlerle türetir.", ["alan"]),
            ]),
        ]),
        unit("GEO.10.2", "Dörtgenler", [
            topic("Dörtgen Özellikleri", "GEO.10.2.1", [
                ("Dörtgenlerin açı ve kenar ilişkilerini ispatlar.", ["dörtgen"]),
                ("Özel dörtgenlerin (yamuk, paralelkenar) alan formüllerini uygular.", ["yamuk", "alan"]),
            ]),
        ]),
        unit("GEO.10.3", "Çokgenler", [
            topic("Düzgün Çokgenler", "GEO.10.3.1", [
                ("Düzgün çokgenlerin iç ve dış açı ölçülerini hesaplar.", ["düzgün çokgen"]),
                ("Çokgenlerde köşegen sayısı ve simetri özelliklerini belirler.", ["köşegen"]),
            ]),
        ]),
        unit("GEO.10.4", "Çember", [
            topic("Çember ve Daire", "GEO.10.4.1", [
                ("Çemberde teğet, kiriş ve yay özelliklerini uygular.", ["çember", "teğet", "kiriş"]),
                ("Çemberde açı teoremlerini (merkez, çevre açı) kullanır.", ["merkez açı", "çevre açı"]),
                ("Dairenin alanını ve yay uzunluğunu hesaplar.", ["daire alanı", "yay"]),
            ]),
        ]),
        unit("GEO.10.5", "Katı Cisimler", [
            topic("Uzay Geometri", "GEO.10.5.1", [
                ("Prizma ve piramitlerin hacim ve yüzey alanını hesaplar.", ["prizma", "piramit"]),
                ("Silindir, koni ve kürenin elemanlarını tanır; formüllerini uygular.", ["silindir", "koni", "küre"]),
                ("Katı cisimler arasındaki benzerlik oranlarını kullanır.", ["benzerlik", "hacim oranı"]),
            ]),
        ]),
    ]),
    "physics": base(10, "Fizik", "MEB Fizik Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("FİZ.10.1", "Elektrik ve Manyetizma", [
            topic("Elektrik Akımı", "FİZ.10.1.1", [
                ("Elektrik akımı, direnç ve gerilim kavramlarını tanır.", ["akım", "direnç", "gerilim"]),
                ("Ohm yasasını uygular; seri ve paralel bağlantıları analiz eder.", ["Ohm", "seri", "paralel"]),
                ("Elektrik gücü ve enerjiyi hesaplar.", ["elektrik gücü"]),
            ]),
            topic("Manyetizma", "FİZ.10.1.2", [
                ("Mıknatıs ve manyetik alan kavramlarını açıklar.", ["mıknatıs", "manyetik alan"]),
                ("Akımın manyetik etkisini yorumlar.", ["elektromanyetizma"]),
            ]),
        ]),
        unit("FİZ.10.2", "Basınç ve Kaldırma Kuvveti", [
            topic("Basınç", "FİZ.10.2.1", [
                ("Katı, sıvı ve gaz basıncını hesaplar.", ["basınç"]),
                ("Arşimed prensibini uygular.", ["Arşimed", "kaldırma kuvveti"]),
                ("Basınçla ilgili günlük yaşam problemlerini çözer.", ["basınç problemi"]),
            ]),
        ]),
        unit("FİZ.10.3", "Dalgalar", [
            topic("Dalga Hareketi", "FİZ.10.3.1", [
                ("Mekanik dalgaların özelliklerini (genlik, frekans, periyot, dalga boyu) tanır.", ["dalga", "frekans"]),
                ("Yansıma, kırılma ve girişim olaylarını açıklar.", ["yansıma", "kırılma", "girişim"]),
                ("Ses dalgalarının özelliklerini yorumlar.", ["ses"]),
            ]),
        ]),
        unit("FİZ.10.4", "Optik", [
            topic("Işık ve Görüntü", "FİZ.10.4.1", [
                ("Işığın yansıma ve kırılma yasalarını uygular.", ["Snell", "yansıma"]),
                ("Düzlem ve küresel aynalarda görüntü oluşumunu açıklar.", ["ayna", "görüntü"]),
                ("Merceklerde odak ve görüntü özelliklerini belirler.", ["mercek", "odak"]),
                ("Prizma ve renk ayrımını yorumlar.", ["prizma", "renk"]),
            ]),
        ]),
    ]),
    "chemistry": base(10, "Kimya", "MEB Kimya Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("KİM.10.1", "Asitler, Bazlar ve Tuzlar", [
            topic("Asit-Baz Teorisi", "KİM.10.1.1", [
                ("Arrhenius, Bronsted-Lowry asit-baz tanımlarını açıklar.", ["asit", "baz", "Arrhenius"]),
                ("pH ve pOH kavramlarını kullanır; hesaplamalar yapar.", ["pH", "pOH"]),
                ("Nötrleşme tepkimelerini denkleştirir.", ["nötrleşme"]),
                ("Tuzların oluşumunu ve özelliklerini açıklar.", ["tuz"]),
            ]),
        ]),
        unit("KİM.10.2", "Karışımlar", [
            topic("Homojen ve Heterojen Karışımlar", "KİM.10.2.1", [
                ("Çözelti, süspansiyon ve emülsiyon ayrımını yapar.", ["çözelti", "süspansiyon"]),
                ("Derişim birimlerini (% m/m, molarite) kullanır.", ["derişim", "molarite"]),
                ("Ayırma ve saflaştırma tekniklerini (damıtma, kristallendirme, kromatografi) açıklar.", ["ayırma"]),
            ]),
        ]),
        unit("KİM.10.3", "Kimya Endüstrisi", [
            topic("Endüstriyel Süreçler", "KİM.10.3.1", [
                ("Haber-Bosch, Contact ve Solvay proseslerini açıklar.", ["Haber-Bosch", "endüstri"]),
                ("Petrokimya ve polimer üretiminin temellerini tanır.", ["petrokimya", "polimer"]),
            ]),
        ]),
        unit("KİM.10.4", "Kimya Her Yerde", [
            topic("Günlük Yaşamda Kimya", "KİM.10.4.1", [
                ("Temizlik maddelerinin kimyasal etkilerini açıklar.", ["deterjan", "sabun"]),
                ("Gıda katkı maddelerini ve koruyucuları değerlendirir.", ["gıda katkı"]),
                ("İlaç ve kozmetik ürünlerdeki kimyasal bileşenleri tanır.", ["ilaç", "kozmetik"]),
            ]),
        ]),
    ]),
    "biology": base(10, "Biyoloji", "MEB Biyoloji Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("BİY.10.1", "Hücre Bölünmeleri", [
            topic("Mitoz ve Mayoz", "BİY.10.1.1", [
                ("Mitoz bölünme evrelerini sıralar ve hücre çeşidine göre yorumlar.", ["mitoz"]),
                ("Mayoz bölünme evrelerini açıklar; genetik çeşitlilikle ilişkilendirir.", ["mayoz"]),
                ("Crossing-over ve bağımsız dağılım kavramlarını kullanır.", ["crossing-over"]),
            ]),
        ]),
        unit("BİY.10.2", "Kalıtım", [
            topic("Mendel Genetiği", "BİY.10.2.1", [
                ("Mendel'in kalıtım yasalarını uygular.", ["Mendel", "kalıtım"]),
                ("Monohibrit ve dihibrit çaprazlamaları çözer.", ["çaprazlama"]),
                ("Punnett karesi ile olası fenotip ve genotip oranlarını hesaplar.", ["Punnett"]),
                ("Eş baskınlık, çok alellilik ve bağlı gen kavramlarını açıklar.", ["alel", "eş baskınlık"]),
            ]),
        ]),
        unit("BİY.10.3", "Ekosistem Ekolojisi", [
            topic("Ekosistem Dinamikleri", "BİY.10.3.1", [
                ("Popülasyon dinamiklerini (büyüme, taşıma kapasitesi) açıklar.", ["popülasyon"]),
                ("Komünite etkileşimlerini (av-avcı, rekabet, simbiyoz) tanır.", ["komünite", "simbiyoz"]),
                ("Enerji piramidi ve biyokütle ilişkilerini yorumlar.", ["enerji piramidi"]),
            ]),
        ]),
        unit("BİY.10.4", "Güncel Biyolojik Konular", [
            topic("Biyoteknoloji", "BİY.10.4.1", [
                ("Genetik mühendisliği ve biyoteknoloji uygulamalarını açıklar.", ["biyoteknoloji", "GMO"]),
                ("Klonlama ve kök hücre araştırmalarının etik boyutunu değerlendirir.", ["klonlama", "kök hücre"]),
            ]),
        ]),
    ]),
    "turkish_lit": base(10, "Türk Dili ve Edebiyatı", "MEB Türk Dili ve Edebiyatı Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("TDE.10.1", "Tanzimat Edebiyatı", [
            topic("Tanzimat Dönemi", "TDE.10.1.1", [
                ("Tanzimat döneminin tarihî ve sosyal arka planını açıklar.", ["Tanzimat"]),
                ("Tanzimat dönemi roman, hikâye ve şiir özelliklerini tanır.", ["Tanzimat romanı"]),
                ("Şinasi, Namık Kemal, Ziya Paşa eserlerinden örnekler inceler.", ["Şinasi", "Namık Kemal"]),
            ]),
        ]),
        unit("TDE.10.2", "Servet-i Fünun ve Fecr-i Ati", [
            topic("II. Dönem Tanzimat ve Sonrası", "TDE.10.2.1", [
                ("Servet-i Fünun edebiyatının özelliklerini açıklar.", ["Servet-i Fünun"]),
                ("Tevfik Fikret, Cenap Şahabettin ve Halit Ziya eserlerini tanır.", ["Tevfik Fikret"]),
                ("Fecr-i Ati topluluğunun sanat anlayışını değerlendirir.", ["Fecr-i Ati"]),
            ]),
        ]),
        unit("TDE.10.3", "Milli Edebiyat", [
            topic("Milli Edebiyat Dönemi", "TDE.10.3.1", [
                ("Milli Edebiyat akımının amaç ve ilkelerini açıklar.", ["Milli Edebiyat"]),
                ("Ömer Seyfettin, Ziya Gökalp ve Mehmet Emin Yurdakul eserlerini inceler.", ["Ömer Seyfettin"]),
            ]),
        ]),
        unit("TDE.10.4", "Cumhuriyet Dönemi Şiiri", [
            topic("Cumhuriyet Şiiri", "TDE.10.4.1", [
                ("Cumhuriyet dönemi şiir akımlarını (Garip, İkinci Yeni) tanır.", ["Garip", "İkinci Yeni"]),
                ("Nazım Hikmet, Orhan Veli ve Fazıl Hüsnü eserlerinden örnekler analiz eder.", ["Nazım Hikmet"]),
            ]),
        ]),
    ]),
    "history": base(10, "Tarih", "MEB Tarih Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("TAR.10.1", "Osmanlı Devleti Kuruluş Dönemi", [
            topic("Kuruluş ve Yükseliş", "TAR.10.1.1", [
                ("Osmanlı Beyliği'nin kuruluşunu ve ilk fetihlerini açıklar.", ["Osmanlı kuruluş"]),
                ("Rumeli'deki fetihlerin stratejik önemini değerlendirir.", ["Rumeli fetihleri"]),
                ("Osmanlı'da devlet teşkilatının temel yapısını tanır.", ["devlet teşkilatı"]),
            ]),
        ]),
        unit("TAR.10.2", "Osmanlı Yükselme Dönemi", [
            topic("Fatih ve Kanuni Dönemi", "TAR.10.2.1", [
                ("İstanbul'un fethinin dünya tarihindeki yerini açıklar.", ["İstanbul'un fethi"]),
                ("Kanuni dönemindeki askerî ve siyasi gelişmeleri sıralar.", ["Kanuni"]),
                ("Osmanlı'da klasik dönem kültür ve sanatını tanır.", ["klasik dönem"]),
            ]),
        ]),
        unit("TAR.10.3", "Osmanlı Duraklama ve Gerileme", [
            topic("XVII-XVIII. Yüzyıl", "TAR.10.3.1", [
                ("Duraklama ve gerileme döneminin nedenlerini analiz eder.", ["duraklama", "gerileme"]),
                ("Islahat hareketlerini (Lale Devri, III. Selim) değerlendirir.", ["ıslahat"]),
            ]),
        ]),
        unit("TAR.10.4", "Osmanlı Dağılma Dönemi", [
            topic("XIX. Yüzyıl", "TAR.10.4.1", [
                ("Tanzimat ve Islahat Fermanlarının içeriğini açıklar.", ["Tanzimat", "Islahat"]),
                ("93 Harbi ve Berlin Antlaşması'nın sonuçlarını değerlendirir.", ["93 Harbi"]),
                ("Osmanlı'da demokratikleşme sürecini yorumlar.", ["demokratikleşme"]),
            ]),
        ]),
    ]),
    "geography": base(10, "Coğrafya", "MEB Coğrafya Dersi Öğretim Programı (Lise, 10. Sınıf)", [
        unit("COĞ.10.1", "Türkiye'nin Coğrafi Konumu", [
            topic("Konum Özellikleri", "COĞ.10.1.1", [
                ("Türkiye'nin matematik ve özel konumunun sonuçlarını açıklar.", ["matematik konum", "özel konum"]),
                ("Komşu ülkelerle ilişkileri harita üzerinde gösterir.", ["komşu ülkeler"]),
            ]),
        ]),
        unit("COĞ.10.2", "Türkiye'nin Fiziki Coğrafyası", [
            topic("Yer Şekilleri ve Akarsular", "COĞ.10.2.1", [
                ("Türkiye'nin dağ, ova ve plato dağılışını harita üzerinde analiz eder.", ["dağ", "ova", "plato"]),
                ("Akarsu rejimlerini ve barajların önemini açıklar.", ["akarsu", "baraj"]),
            ]),
        ]),
        unit("COĞ.10.3", "Türkiye'nin İklimi", [
            topic("İklim Tipleri", "COĞ.10.3.1", [
                ("Türkiye'de görülen iklim tiplerini (Akdeniz, Karadeniz, step) karşılaştırır.", ["Akdeniz iklimi"]),
                ("Mikroklima örneklerini tanır.", ["mikroklima"]),
            ]),
        ]),
        unit("COĞ.10.4", "Beşerî Coğrafya", [
            topic("Nüfus ve Yerleşme", "COĞ.10.4.1", [
                ("Türkiye'nin nüfus özelliklerini (yoğunluk, yaş yapısı) yorumlar.", ["nüfus yoğunluğu"]),
                ("Kırsal-kentsel yerleşme tiplerini ayırt eder.", ["yerleşme"]),
                ("Göç hareketlerinin neden ve sonuçlarını analiz eder.", ["iç göç", "dış göç"]),
            ]),
        ]),
    ]),
}

GRADE_11 = {
    "math": base(11, "Matematik", "MEB Matematik Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("M.11.1", "Trigonometri", [
            topic("Trigonometrik Oranlar", "M.11.1.1", [
                ("Açıların trigonometrik oranlarını (sin, cos, tan) hesaplar.", ["trigonometri", "sin", "cos"]),
                ("Trigonometrik özdeşlikleri uygular.", ["özdeşlik"]),
                ("Toplam-fark ve yarım açı formüllerini kullanır.", ["toplam formülü"]),
                ("Trigonometrik denklemleri çözer.", ["trigonometrik denklem"]),
            ]),
        ]),
        unit("M.11.2", "Analitik Geometri", [
            topic("Doğru ve Çember", "M.11.2.1", [
                ("İki nokta arasındaki uzaklığı ve orta noktayı hesaplar.", ["uzaklık", "orta nokta"]),
                ("Doğrunun eğimini ve denklemini bulur.", ["eğim", "doğru denklemi"]),
                ("Paralel ve dik doğruların denklemlerini yazar.", ["paralel", "dik"]),
                ("Çemberin standart denklemini kullanır.", ["çember denklemi"]),
            ]),
        ]),
        unit("M.11.3", "Fonksiyonlarda Uygulamalar", [
            topic("Fonksiyon Dönüşümleri", "M.11.3.1", [
                ("Fonksiyonlarda öteleme, yansıma ve ölçekleme dönüşümlerini uygular.", ["dönüşüm", "öteleme"]),
                ("Üstel ve logaritmik fonksiyonları inceler.", ["üstel", "logaritma"]),
                ("Fonksiyon grafiklerini dönüşümlerle çizer.", ["grafik"]),
            ]),
        ]),
        unit("M.11.4", "Diziler", [
            topic("Aritmetik ve Geometrik Dizi", "M.11.4.1", [
                ("Aritmetik dizinin genel terimini ve toplamını bulur.", ["aritmetik dizi"]),
                ("Geometrik dizinin genel terimini ve toplamını bulur.", ["geometrik dizi"]),
                ("Dizi problemlerini çözer.", ["dizi problemi"]),
            ]),
        ]),
        unit("M.11.5", "Limit ve Süreklilik", [
            topic("Limit Kavramı", "M.11.5.1", [
                ("Fonksiyonlarda limit kavramını tanır; limit hesaplar.", ["limit"]),
                ("Süreklilik kavramını açıklar.", ["süreklilik"]),
                ("Belirsizlik durumlarında limit tekniklerini uygular.", ["belirsizlik"]),
            ]),
        ]),
    ]),
    "geometry": base(11, "Geometri", "MEB Geometri Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("GEO.11.1", "Analitik Geometri", [
            topic("Doğru ve Düzlem", "GEO.11.1.1", [
                ("Doğrunun analitik denklemini farklı formlarda yazar.", ["doğru denklemi"]),
                ("İki doğrunun birbirine göre durumunu belirler.", ["kesişim", "paralel"]),
                ("Noktanın doğruya uzaklığını hesaplar.", ["uzaklık"]),
            ]),
        ]),
        unit("GEO.11.2", "Dönüşümler", [
            topic("Geometrik Dönüşümler", "GEO.11.2.1", [
                ("Öteleme, dönme ve yansıma dönüşümlerini uygular.", ["dönme", "yansıma"]),
                ("Bileşik dönüşümleri analiz eder.", ["bileşik dönüşüm"]),
            ]),
        ]),
        unit("GEO.11.3", "Çember ve Daire", [
            topic("Çember Geometrisi", "GEO.11.3.1", [
                ("Çemberde teğet-kiriş açı ilişkilerini uygular.", ["teğet", "kiriş"]),
                ("İki çemberin birbirine göre durumunu belirler.", ["çember durumu"]),
                ("Çemberin analitik denklemini kullanır.", ["çember denklemi"]),
            ]),
        ]),
    ]),
    "physics": base(11, "Fizik", "MEB Fizik Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("FİZ.11.1", "Kuvvet ve Hareket (İleri)", [
            topic("Vektörler ve Bağıl Hareket", "FİZ.11.1.1", [
                ("Vektörleri bileşenlerine ayırır; vektörel toplama yapar.", ["vektör"]),
                ("Bağıl hız kavramını uygular.", ["bağıl hız"]),
                ("Düzgün çembersel hareketi açıklar; merkezcil kuvvet hesaplar.", ["çembersel hareket"]),
            ]),
        ]),
        unit("FİZ.11.2", "Enerji", [
            topic("Enerji ve Momentum", "FİZ.11.2.1", [
                ("Mekanik enerji korunumunu problem çözümünde kullanır.", ["mekanik enerji"]),
                ("İtme-momentum teoremini uygular.", ["itme", "momentum"]),
                ("Esnek ve esnek olmayan çarpışmaları analiz eder.", ["çarpışma"]),
            ]),
        ]),
        unit("FİZ.11.3", "Elektrik ve Manyetizma", [
            topic("Elektrik Alan ve Potansiyel", "FİZ.11.3.1", [
                ("Elektrik alan ve potansiyel kavramlarını hesaplar.", ["elektrik alan", "potansiyel"]),
                ("Kondansatörlerin özelliklerini açıklar.", ["kondansatör"]),
                ("Manyetik indüksiyon ve Faraday yasasını uygular.", ["indüksiyon", "Faraday"]),
                ("Alternatif akım devrelerini yorumlar.", ["alternatif akım"]),
            ]),
        ]),
    ]),
    "chemistry": base(11, "Kimya", "MEB Kimya Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("KİM.11.1", "Modern Atom Teorisi", [
            topic("Kuantum Modeli", "KİM.11.1.1", [
                ("Bohr atom modelinin sınırlılıklarını açıklar.", ["Bohr"]),
                ("Kuantum sayılarını tanır; elektron dizilimini yazar.", ["kuantum sayısı", "orbital"]),
                ("Periyodik özelliklerdeki eğilimleri elektron dizilimiyle ilişkilendirir.", ["periyodik özellik"]),
            ]),
        ]),
        unit("KİM.11.2", "Gazlar", [
            topic("Gaz Yasaları", "KİM.11.2.1", [
                ("Boyle, Charles ve Gay-Lussac yasalarını uygular.", ["Boyle", "Charles"]),
                ("İdeal gaz denklemini kullanır.", ["ideal gaz"]),
                ("Graham difüzyon yasasını açıklar.", ["difüzyon"]),
            ]),
        ]),
        unit("KİM.11.3", "Sıvı Çözeltiler", [
            topic("Çözünürlük", "KİM.11.3.1", [
                ("Çözünürlük kavramını tanır; derişim hesaplar.", ["çözünürlük"]),
                ("Kolligatif özellikleri açıklar.", ["kolligatif"]),
                ("Koligatif özelliklerle ilgili hesaplamalar yapar.", ["donma noktası", "kaynama noktası"]),
            ]),
        ]),
        unit("KİM.11.4", "Kimyasal Tepkimelerde Enerji, Hız ve Denge", [
            topic("Tepkime Termodinamiği", "KİM.11.4.1", [
                ("Entalpi değişimini hesaplar; Hess yasasını uygular.", ["entalpi", "Hess"]),
                ("Aktivasyon enerjisi ve tepkime hızını açıklar.", ["aktivasyon enerjisi"]),
                ("Kimyasal denge kavramını tanır; Le Chatelier ilkesini uygular.", ["denge", "Le Chatelier"]),
            ]),
        ]),
    ]),
    "biology": base(11, "Biyoloji", "MEB Biyoloji Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("BİY.11.1", "İnsan Fizyolojisi", [
            topic("Sindirim ve Dolaşım", "BİY.11.1.1", [
                ("Sindirim sisteminin yapısını ve enzimlerin rolünü açıklar.", ["sindirim", "enzim"]),
                ("Dolaşım sisteminin yapısını (kalp, damar, kan) tanır.", ["dolaşım", "kalp"]),
            ]),
            topic("Solunum ve Boşaltım", "BİY.11.1.2", [
                ("Solunum sisteminin gaz alışverişi mekanizmasını açıklar.", ["solunum"]),
                ("Boşaltım sisteminin yapısını ve idrar oluşumunu tanır.", ["boşaltım", "böbrek"]),
            ]),
            topic("Sinir ve Endokrin", "BİY.11.1.3", [
                ("Sinir sisteminin yapısını (nöron, refleks) açıklar.", ["sinir", "refleks"]),
                ("Endokrin sistemin hormonları ve düzenleme işlevlerini tanır.", ["hormon", "endokrin"]),
            ]),
            topic("Destek-Hareket ve Duyu", "BİY.11.1.4", [
                ("İskelet ve kas sisteminin yapısını açıklar.", ["iskelet", "kas"]),
                ("Duyu organlarının yapı ve işlevlerini tanır.", ["duyu organı"]),
            ]),
        ]),
        unit("BİY.11.2", "Komünite ve Popülasyon", [
            topic("Ekolojik İlişkiler", "BİY.11.2.1", [
                ("Popülasyon büyüklüğünü etkileyen faktörleri analiz eder.", ["popülasyon"]),
                ("Komünite yapısını ve tür çeşitliliğini açıklar.", ["komünite", "tür çeşitliliği"]),
                ("Ekolojik başarı ve süksesyon süreçlerini yorumlar.", ["süksesyon"]),
            ]),
        ]),
    ]),
    "turkish_lit": base(11, "Türk Dili ve Edebiyatı", "MEB Türk Dili ve Edebiyatı Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("TDE.11.1", "Cumhuriyet Dönemi Roman", [
            topic("Cumhuriyet Romanı", "TDE.11.1.1", [
                ("Cumhuriyet dönemi romanının gelişim evrelerini açıklar.", ["Cumhuriyet romanı"]),
                ("Yakup Kadri, Reşat Nuri, Halide Edip eserlerini inceler.", ["Yakup Kadri"]),
                ("Toplumcu gerçekçi roman özelliklerini tanır.", ["toplumcu gerçekçilik"]),
            ]),
        ]),
        unit("TDE.11.2", "Cumhuriyet Dönemi Tiyatrosu", [
            topic("Tiyatro", "TDE.11.2.1", [
                ("Cumhuriyet dönemi tiyatro eserlerinin özelliklerini açıklar.", ["tiyatro"]),
                ("Haldun Taner, Muhsin Ertuğrul eserlerinden örnekler inceler.", ["Haldun Taner"]),
            ]),
        ]),
        unit("TDE.11.3", "Dünya Edebiyatı", [
            topic("Dünya Edebiyatından Örnekler", "TDE.11.3.1", [
                ("Klasik ve modern dünya edebiyatından eserleri tanır.", ["dünya edebiyatı"]),
                ("Türk edebiyatı ile dünya edebiyatı arasındaki etkileşimleri açıklar.", ["etkileşim"]),
            ]),
        ]),
    ]),
    "history": base(11, "Tarih", "MEB Tarih Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("TAR.11.1", "20. Yüzyıl Başlarında Dünya", [
            topic("I. Dünya Savaşı", "TAR.11.1.1", [
                ("I. Dünya Savaşı'nın nedenlerini ve sonuçlarını açıklar.", ["I. Dünya Savaşı"]),
                ("Osmanlı Devleti'nin savaştaki durumunu değerlendirir.", ["Osmanlı savaş"]),
                ("Mondros ve Sevr antlaşmalarının etkilerini analiz eder.", ["Mondros", "Sevr"]),
            ]),
        ]),
        unit("TAR.11.2", "Milli Mücadele", [
            topic("Kurtuluş Savaşı", "TAR.11.2.1", [
                ("Kuvâ-yi Milliye hareketini ve kongrelerin önemini açıklar.", ["Kuvâ-yi Milliye"]),
                ("TBMM'nin açılışını ve Misak-ı Millî'yi değerlendirir.", ["TBMM", "Misak-ı Millî"]),
                ("Cephelerdeki (Doğu, Batı, Güney) mücadeleleri sıralar.", ["cephe"]),
                ("Lozan Barış Antlaşması'nın önemini açıklar.", ["Lozan"]),
            ]),
        ]),
        unit("TAR.11.3", "Atatürk İlkeleri ve İnkılap Tarihi", [
            topic("İnkılaplar", "TAR.11.3.1", [
                ("Siyasi, hukuk, eğitim ve sosyal inkılapları sıralar.", ["inkılap"]),
                ("Atatürk ilkelerini (Cumhuriyetçilik, Halkçılık, Laiklik vb.) açıklar.", ["Atatürk ilkeleri"]),
                ("Çok partili hayata geçiş sürecini değerlendirir.", ["çok partili hayat"]),
            ]),
        ]),
        unit("TAR.11.4", "II. Dünya Savaşı ve Sonrası", [
            topic("II. Dünya Savaşı", "TAR.11.4.1", [
                ("II. Dünya Savaşı'nın nedenlerini ve Türkiye'nin tutumunu açıklar.", ["II. Dünya Savaşı"]),
                ("Savaş sonrası dünya düzenindeki değişimleri yorumlar.", ["Soğuk Savaş"]),
            ]),
        ]),
    ]),
    "geography": base(11, "Coğrafya", "MEB Coğrafya Dersi Öğretim Programı (Lise, 11. Sınıf)", [
        unit("COĞ.11.1", "Ekonomik Faaliyetler", [
            topic("Tarım ve Sanayi", "COĞ.11.1.1", [
                ("Türkiye'de tarım ürünlerinin dağılışını harita üzerinde gösterir.", ["tarım"]),
                ("Sanayi bölgelerini ve gelişmişlik farklarını analiz eder.", ["sanayi"]),
                ("Enerji kaynaklarının dağılışını açıklar.", ["enerji"]),
            ]),
        ]),
        unit("COĞ.11.2", "Ulaşım ve Ticaret", [
            topic("Ulaşım Ağları", "COĞ.11.2.1", [
                ("Türkiye'nin ulaşım sistemini (karayolu, demiryolu, havayolu) değerlendirir.", ["ulaşım"]),
                ("Dış ticaret rotalarını ve limanların önemini açıklar.", ["dış ticaret"]),
            ]),
        ]),
        unit("COĞ.11.3", "Bölgeler Coğrafyası", [
            topic("Türkiye'nin Bölgeleri", "COĞ.11.3.1", [
                ("Türkiye'nin coğrafi bölgelerinin fiziki ve beşerî özelliklerini karşılaştırır.", ["coğrafi bölge"]),
                ("Bölgesel kalkınma projelerini tanır.", ["GAP", "DAP"]),
            ]),
        ]),
        unit("COĞ.11.4", "Küresel Sorunlar", [
            topic("Çevre ve Sürdürülebilirlik", "COĞ.11.4.1", [
                ("Küresel ısınma ve iklim değişikliğinin etkilerini açıklar.", ["küresel ısınma"]),
                ("Doğal afetlerin (deprem, sel, kuraklık) coğrafi dağılışını analiz eder.", ["doğal afet"]),
            ]),
        ]),
    ]),
}

GRADE_12 = {
    "math": base(12, "Matematik", "MEB Matematik Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("M.12.1", "Limit, Türev ve İntegral", [
            topic("Türev", "M.12.1.1", [
                ("Türev kavramını tanır; türev alma kurallarını uygular.", ["türev"]),
                ("Türevin geometrik anlamını (teğet eğimi) yorumlar.", ["teğet"]),
                ("Türevin fiziksel anlamını (anlık hız) açıklar.", ["anlık hız"]),
                ("Maksimum-minimum problemlerini türevle çözer.", ["optimizasyon"]),
            ]),
            topic("İntegral", "M.12.1.2", [
                ("Belirsiz integral kavramını tanır; temel integralleri bulur.", ["integral"]),
                ("Belirli integral ile alan hesabı yapar.", ["belirli integral", "alan"]),
                ("İntegral uygulamalarını (hacim, hız-yol) çözer.", ["integral uygulama"]),
            ]),
        ]),
        unit("M.12.2", "Olasılık", [
            topic("Olasılık Hesabı", "M.12.2.1", [
                ("Koşullu olasılık kavramını uygular.", ["koşullu olasılık"]),
                ("Bağımsız olayları tanır; çarpım kuralını kullanır.", ["bağımsız olay"]),
                ("Permütasyon ve kombinasyon problemlerini çözer.", ["permütasyon", "kombinasyon"]),
                ("Binom açılımını uygular.", ["binom"]),
            ]),
        ]),
    ]),
    "geometry": base(12, "Geometri", "MEB Geometri Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("GEO.12.1", "Dönel Cisimler", [
            topic("Dönel Katı Cisimler", "GEO.12.1.1", [
                ("Dönel cisimlerin (silindir, koni, küre) hacim ve alan formüllerini uygular.", ["dönel cisim"]),
                ("Dönel cisimler arasındaki benzerlik oranlarını kullanır.", ["benzerlik"]),
            ]),
        ]),
        unit("GEO.12.2", "Vektörler", [
            topic("Vektör İşlemleri", "GEO.12.2.1", [
                ("Vektörleri bileşenlerine ayırır; toplama ve çıkarma yapar.", ["vektör"]),
                ("Skaler çarpım ve vektörel çarpımı uygular.", ["skaler çarpım", "vektörel çarpım"]),
                ("Vektörlerle doğru denklemi yazar.", ["vektör denklemi"]),
            ]),
        ]),
        unit("GEO.12.3", "Uzayda Doğru ve Düzlem", [
            topic("Uzay Geometrisi", "GEO.12.3.1", [
                ("Uzayda doğrunun ve düzlemin denklemlerini yazar.", ["doğru denklemi", "düzlem"]),
                ("Doğru ile düzlem arasındaki ilişkileri belirler.", ["açı", "paralellik"]),
                ("Uzayda noktanın düzleme uzaklığını hesaplar.", ["uzaklık"]),
            ]),
        ]),
    ]),
    "physics": base(12, "Fizik", "MEB Fizik Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("FİZ.12.1", "Modern Fizik", [
            topic("Özel Görelilik", "FİZ.12.1.1", [
                ("Einstein'ın özel görelilik teorisinin temel postulatlarını açıklar.", ["görelilik"]),
                ("Zaman genişlemesi ve uzunluk büzülmesi kavramlarını yorumlar.", ["zaman genişlemesi"]),
            ]),
            topic("Kuantum Fiziği", "FİZ.12.1.2", [
                ("Fotoelektrik olayını açıklar.", ["fotoelektrik"]),
                ("De Broglie dalga-parçacık dualitesini tanır.", ["de Broglie"]),
            ]),
        ]),
        unit("FİZ.12.2", "Dalgalar", [
            topic("Elektromanyetik Dalgalar", "FİZ.12.2.1", [
                ("Elektromanyetik spektrumu tanır; dalga türlerini sıralar.", ["EM spektrum"]),
                ("Işığın dalga ve parçacık özelliklerini karşılaştırır.", ["foton"]),
            ]),
        ]),
        unit("FİZ.12.3", "Atom Fiziği", [
            topic("Atom ve Çekirdek", "FİZ.12.3.1", [
                ("Atom modellerinin gelişimini açıklar.", ["atom modeli"]),
                ("Radyoaktivite türlerini (alfa, beta, gama) tanır.", ["radyoaktivite"]),
                ("Kütle-enerji eşdeğerliğini (E=mc²) yorumlar.", ["E=mc²"]),
                ("Nükleer enerji ve fisyon-füzyon süreçlerini açıklar.", ["fisyon", "füzyon"]),
            ]),
        ]),
    ]),
    "chemistry": base(12, "Kimya", "MEB Kimya Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("KİM.12.1", "Karbon Kimyası", [
            topic("Karbon Bağları", "KİM.12.1.1", [
                ("Karbon atomunun bağ yapma özelliklerini açıklar.", ["karbon"]),
                ("Hibritleşme kavramını tanır (sp, sp², sp³).", ["hibritleşme"]),
                ("Allotrop modellerini (grafit, elmas, fullerene) tanır.", ["allotrop"]),
            ]),
        ]),
        unit("KİM.12.2", "Organik Bileşikler", [
            topic("Fonksiyonel Gruplar", "KİM.12.2.1", [
                ("Hidrokarbon türlerini (alkan, alken, alkin, aromatik) tanır.", ["hidrokarbon"]),
                ("Alkol, eter, aldehit, keton, karboksilik asit gruplarını ayırt eder.", ["fonksiyonel grup"]),
                ("Organik bileşiklerin adlandırma kurallarını (IUPAC) uygular.", ["IUPAC"]),
                ("Polimerlerin yapısını ve günlük kullanımını açıklar.", ["polimer"]),
            ]),
        ]),
        unit("KİM.12.3", "Enerji Kaynakları", [
            topic("Enerji ve Çevre", "KİM.12.3.1", [
                ("Fosil yakıtların yanma tepkimelerini açıklar.", ["fosil yakıt"]),
                ("Alternatif enerji kaynaklarını (güneş, rüzgâr, hidrojen) karşılaştırır.", ["alternatif enerji"]),
                ("Kimyasal enerjinin dönüşümünü ve verimliliğini değerlendirir.", ["enerji dönüşümü"]),
            ]),
        ]),
    ]),
    "biology": base(12, "Biyoloji", "MEB Biyoloji Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("BİY.12.1", "Canlılarda Enerji Dönüşümleri", [
            topic("Fotosentez ve Solunum", "BİY.12.1.1", [
                ("Fotosentezin aşamalarını (ışık ve karanlık reaksiyon) açıklar.", ["fotosentez"]),
                ("Hücresel solunumun (glikoliz, Krebs, ETS) aşamalarını tanır.", ["hücresel solunum"]),
                ("Fotosentez ve solunum arasındaki ilişkiyi yorumlar.", ["enerji dönüşümü"]),
            ]),
        ]),
        unit("BİY.12.2", "Bitki Biyolojisi", [
            topic("Bitki Yapısı ve İşlevleri", "BİY.12.2.1", [
                ("Bitki dokularını (meristem, iletim, örtü) tanır.", ["bitki dokusu"]),
                ("Kök, gövde ve yaprağın yapısını açıklar.", ["kök", "gövde", "yaprak"]),
                ("Bitkilerde su ve mineral taşınmasını yorumlar.", ["ksilem", "floem"]),
                ("Bitki hormonlarının (oksin, gibberellin) işlevlerini tanır.", ["bitki hormonu"]),
            ]),
        ]),
        unit("BİY.12.3", "Canlılar ve Çevre", [
            topic("Ekoloji ve Koruma", "BİY.12.3.1", [
                ("Biyomları ve ekolojik nişleri tanır.", ["biyom", "niş"]),
                ("İnsan faaliyetlerinin ekosistemlere etkisini değerlendirir.", ["insan etkisi"]),
                ("Koruma alanları ve sürdürülebilir kaynak kullanımını açıklar.", ["koruma", "sürdürülebilirlik"]),
            ]),
        ]),
    ]),
    "turkish_lit": base(12, "Türk Dili ve Edebiyatı", "MEB Türk Dili ve Edebiyatı Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("TDE.12.1", "Tanzimat'tan Günümüze Roman", [
            topic("Roman Gelişimi", "TDE.12.1.1", [
                ("Türk romanının gelişim evrelerini kronolojik sıralar.", ["roman gelişimi"]),
                ("Yaşar Kemal, Orhan Pamuk, Elif Şafak eserlerini inceler.", ["Yaşar Kemal", "Orhan Pamuk"]),
            ]),
        ]),
        unit("TDE.12.2", "Şiir ve Deneme", [
            topic("Modern Şiir", "TDE.12.2.1", [
                ("Cumhuriyet sonrası şiir akımlarını (Garip, İkinci Yeni, Yeni Toplumcu) karşılaştırır.", ["modern şiir"]),
                ("Deneme türünün özelliklerini açıklar; örnek metinler inceler.", ["deneme"]),
            ]),
        ]),
        unit("TDE.12.3", "Edebiyat ve Toplum", [
            topic("Edebiyatın İşlevi", "TDE.12.3.1", [
                ("Edebiyatın toplumsal değişimdeki rolünü değerlendirir.", ["edebiyat", "toplum"]),
                ("Çağdaş Türk edebiyatındaki temaları analiz eder.", ["çağdaş edebiyat"]),
            ]),
        ]),
    ]),
    "history": base(12, "Tarih", "MEB Tarih Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("TAR.12.1", "Atatürk İlkeleri ve İnkılap Tarihi", [
            topic("İnkılap Tarihi", "TAR.12.1.1", [
                ("Atatürk dönemi inkılaplarını kategorilere ayırarak açıklar.", ["inkılap"]),
                ("Atatürk'ün dış politikasını (Lozan, Hatay, Montreux) değerlendirir.", ["dış politika"]),
                ("Atatürk ilkelerinin güncelliğini tartışır.", ["Atatürk ilkeleri"]),
            ]),
        ]),
        unit("TAR.12.2", "Çağdaş Türk ve Dünya Tarihi", [
            topic("Soğuk Savaş Dönemi", "TAR.12.2.1", [
                ("Soğuk Savaş döneminde Türkiye'nin konumunu açıklar.", ["Soğuk Savaş"]),
                ("NATO'ya giriş ve Kore Savaşı'nın önemini değerlendirir.", ["NATO", "Kore"]),
            ]),
            topic("Demokrat Parti Dönemi", "TAR.12.2.2", [
                ("1950 sonrası siyasi gelişmeleri sıralar.", ["Demokrat Parti"]),
                ("27 Mayıs ve sonrası siyasi süreçleri yorumlar.", ["27 Mayıs"]),
            ]),
        ]),
        unit("TAR.12.3", "XXI. Yüzyıl", [
            topic("Güncel Tarih", "TAR.12.3.1", [
                ("Türkiye'nin Avrupa Birliği sürecini değerlendirir.", ["AB süreci"]),
                ("Küreselleşmenin Türkiye üzerindeki etkilerini analiz eder.", ["küreselleşme"]),
            ]),
        ]),
    ]),
    "geography": base(12, "Coğrafya", "MEB Coğrafya Dersi Öğretim Programı (Lise, 12. Sınıf)", [
        unit("COĞ.12.1", "Türkiye'nin Jeopolitiği", [
            topic("Stratejik Konum", "COĞ.12.1.1", [
                ("Türkiye'nin jeopolitik önemini açıklar.", ["jeopolitik"]),
                ("Bölgesel güç dengelerini harita üzerinde analiz eder.", ["güç dengesi"]),
            ]),
        ]),
        unit("COĞ.12.2", "Küresel ve Bölgesel Örgütler", [
            topic("Uluslararası Örgütler", "COĞ.12.2.1", [
                ("BM, NATO, AB, İslam İşbirliği Teşkilatı'nın işlevlerini tanır.", ["BM", "NATO", "AB"]),
                ("Türkiye'nin uluslararası örgütlere üyeliğini değerlendirir.", ["üyelik"]),
            ]),
        ]),
        unit("COĞ.12.3", "Sürdürülebilir Kalkınma", [
            topic("Kalkınma ve Çevre", "COĞ.12.3.1", [
                ("Sürdürülebilir kalkınma hedeflerini açıklar.", ["sürdürülebilir kalkınma"]),
                ("Doğal kaynakların sürdürülebilir kullanımını değerlendirir.", ["doğal kaynak"]),
                ("Türkiye'nin kalkınma planlarını tanır.", ["kalkınma planı"]),
            ]),
        ]),
    ]),
}
