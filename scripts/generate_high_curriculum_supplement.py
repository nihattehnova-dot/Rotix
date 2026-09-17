"""Supplementary MEB outcomes merged into thin high-school curriculum files."""
from generate_high_curriculum_data import unit, topic


def merge_units(data, extra_units):
    data = dict(data)
    data["units"] = list(data["units"]) + extra_units
    return data


SUPPLEMENT = {
    (9, "turkish_lit"): [
        unit("TDE.9.6", "Dil Bilgisi ve Yazım", [
            topic("Dil Bilgisi", "TDE.9.6.1", [
                ("Cümle ögelerini (özne, yüklem, nesne, dolaylı tümleç, zarf tümleci) belirler.", ["cümle ögesi"]),
            ]),
        ]),
    ],
    (9, "history"): [
        unit("TAR.9.5", "Türk Kültür Mirası", [
            topic("Kültür ve Medeniyet", "TAR.9.5.1", [
                ("Türk-İslam devletlerinde bilim, sanat ve mimari alanındaki gelişmeleri açıklar.", ["kültür", "mimari"]),
                ("Türk tarihinde yazı ve alfabe gelişimini sıralar.", ["alfabe", "Orhun"]),
            ]),
        ]),
    ],
    (10, "biology"): [
        unit("BİY.10.5", "Genetik Uygulamalar", [
            topic("Genetik Mühendisliği", "BİY.10.5.1", [
                ("DNA analizi ve gen haritalama yöntemlerini açıklar.", ["DNA", "gen haritası"]),
                ("Genetik hastalıkların tanı ve tedavisindeki gelişmeleri değerlendirir.", ["genetik hastalık"]),
                ("Biyogüvenlik ve etik konularını tartışır.", ["biyogüvenlik", "etik"]),
            ]),
        ]),
    ],
    (10, "chemistry"): [
        unit("KİM.10.5", "Kimyasal Hesaplamalar", [
            topic("Mol ve Stokiyometri", "KİM.10.5.1", [
                ("Mol kavramını kullanarak kütle-hacim dönüşümleri yapar.", ["mol", "stokiyometri"]),
                ("Tepkime denklemlerinden mol hesaplamaları yapar.", ["mol hesabı"]),
                ("Sınırlayıcı bileşen problemlerini çözer.", ["sınırlayıcı bileşen"]),
            ]),
        ]),
    ],
    (10, "geography"): [
        unit("COĞ.10.5", "Harita Bilgisi", [
            topic("Harita Okuma", "COĞ.10.5.1", [
                ("Harita projeksiyonlarını ve ölçek türlerini tanır.", ["projeksiyon", "ölçek"]),
                ("Topografya haritalarını okur; eş yükselti eğrilerini yorumlar.", ["topografya", "eş yükselti"]),
                ("Coğrafi bilgi sistemlerinin (CBS) temel işlevlerini açıklar.", ["CBS", "GIS"]),
            ]),
        ]),
        unit("COĞ.10.6", "Doğal Kaynaklar", [
            topic("Kaynak Kullanımı", "COĞ.10.6.1", [
                ("Türkiye'nin maden ve enerji kaynaklarının dağılışını harita üzerinde gösterir.", ["maden", "enerji"]),
                ("Doğal kaynakların sürdürülebilir kullanımını değerlendirir.", ["sürdürülebilirlik"]),
                ("Su kaynaklarının yönetimi ve kuraklık sorununu analiz eder.", ["su kaynağı", "kuraklık"]),
            ]),
        ]),
    ],
    (10, "history"): [
        unit("TAR.10.5", "Osmanlı Kültür ve Medeniyeti", [
            topic("Kültür ve Sanat", "TAR.10.5.1", [
                ("Osmanlı'da eğitim ve bilim kurumlarını (medrese, Enderun) tanır.", ["medrese", "Enderun"]),
                ("Osmanlı mimarisinin özelliklerini örnek eserlerle açıklar.", ["Osmanlı mimarisi"]),
                ("Osmanlı'da sanat ve edebiyat alanındaki gelişmeleri sıralar.", ["Osmanlı sanatı"]),
                ("Osmanlı toplum yapısını (millet sistemi) açıklar.", ["millet sistemi"]),
            ]),
        ]),
    ],
    (10, "geometry"): [
        unit("GEO.10.6", "Geometrik İspat", [
            topic("İspat Teknikleri", "GEO.10.6.1", [
                ("Geometrik ispatlarda aksiyom ve teorem kullanımını uygular.", ["ispat", "teorem"]),
                ("Üçgen ve dörtgenlerde simetri özelliklerini ispatlar.", ["simetri"]),
            ]),
        ]),
    ],
    (10, "geometry"): [
        unit("GEO.10.6", "Geometrik İspat", [
            topic("İspat Teknikleri", "GEO.10.6.1", [
                ("Geometrik ispatlarda aksiyom ve teorem kullanımını uygular.", ["ispat", "teorem"]),
                ("Üçgen ve dörtgenlerde simetri özelliklerini ispatlar.", ["simetri"]),
            ]),
        ]),
    ],
    (10, "turkish_lit"): [
        unit("TDE.10.5", "Dil Bilgisi ve Anlatım", [
            topic("Anlatım Teknikleri", "TDE.10.5.1", [
                ("Betimleme, öyküleme, açıklama ve tartışma tekniklerini metinlerde ayırt eder.", ["anlatım tekniği"]),
                ("Paragraf yapısını (giriş, gelişme, sonuç) analiz eder.", ["paragraf"]),
                ("Yazım ve noktalama kurallarını uygular.", ["yazım", "noktalama"]),
                ("Kaynak gösterme ve alıntı yapma kurallarını uygular.", ["kaynak gösterme"]),
                ("Sözlü anlatım ve sunum becerilerini geliştirir.", ["sözlü anlatım"]),
            ]),
        ]),
    ],
    (11, "biology"): [
        unit("BİY.11.3", "Bağışıklık Sistemi", [
            topic("Savunma Mekanizmaları", "BİY.11.3.1", [
                ("Bağışıklık sisteminin yapısını (doğuştan, kazanılmış) açıklar.", ["bağışıklık"]),
                ("Aşı ve antikor kavramlarını ilişkilendirir.", ["aşı", "antikor"]),
                ("Bağışıklık sisteminin hastalıklarla mücadelesini yorumlar.", ["bağışıklık hastalığı"]),
                ("Bağışıklık sisteminin sağlıklı yaşamla ilişkisini değerlendirir.", ["sağlıklı yaşam"]),
            ]),
        ]),
    ],
    (11, "chemistry"): [
        unit("KİM.11.5", "Elektrokimya", [
            topic("Redoks ve Pil", "KİM.11.5.1", [
                ("Yükseltgenme ve indirgenme tepkimelerini tanır.", ["redoks"]),
                ("Pil ve elektroliz olaylarını açıklar.", ["pil", "elektroliz"]),
                ("Standart elektrot potansiyellerini yorumlar.", ["elektrot potansiyeli"]),
            ]),
        ]),
    ],
    (11, "geography"): [
        unit("COĞ.11.5", "Turizm Coğrafyası", [
            topic("Turizm Potansiyeli", "COĞ.11.5.1", [
                ("Türkiye'nin turizm türlerini (kültür, deniz, kış, termal) sınıflandırır.", ["turizm"]),
                ("Turizmin ekonomik ve sosyal etkilerini değerlendirir.", ["turizm etkisi"]),
                ("Sürdürülebilir turizm ilkelerini açıklar.", ["sürdürülebilir turizm"]),
            ]),
        ]),
        unit("COĞ.11.6", "Harita ve Grafik", [
            topic("Veri Yorumlama", "COĞ.11.6.1", [
                ("İstatistiksel verileri harita ve grafiklerle yorumlar.", ["grafik", "istatistik"]),
                ("Nüfus ve ekonomi verilerini karşılaştırmalı analiz eder.", ["karşılaştırma"]),
                ("Coğrafi verileri dijital platformlarda kullanır.", ["dijital harita"]),
            ]),
        ]),
    ],
    (11, "geometry"): [
        unit("GEO.11.4", "Trigonometrik Uygulamalar", [
            topic("Trigonometri ve Geometri", "GEO.11.4.1", [
                ("Trigonometrik oranları geometrik problemlerde kullanır.", ["trigonometri"]),
                ("Üçgende sinüs ve kosinüs teoremlerini uygular.", ["sinüs teoremi", "kosinüs teoremi"]),
                ("Trigonometrik alan formüllerini kullanır.", ["trigonometrik alan"]),
            ]),
        ]),
        unit("GEO.11.5", "Katı Cisimler", [
            topic("Uzay Geometri", "GEO.11.5.1", [
                ("Prizma ve piramitlerin hacim formüllerini uygular.", ["hacim"]),
                ("Kesit alanlarını hesaplar.", ["kesit"]),
                ("Uzayda açı ve mesafe problemlerini çözer.", ["uzay açısı"]),
                ("Gerçek yaşam problemlerinde geometrik modelleme yapar.", ["modelleme"]),
            ]),
        ]),
    ],
    (11, "history"): [
        unit("TAR.11.5", "Çok Partili Hayat", [
            topic("Demokratikleşme Süreci", "TAR.11.5.1", [
                ("1950 seçimlerinin demokratikleşmedeki yerini açıklar.", ["1950 seçimleri"]),
                ("Çok partili dönemdeki siyasi gelişmeleri kronolojik sıralar.", ["çok partili"]),
                ("Türkiye'nin uluslararası örgütlere katılımını değerlendirir.", ["uluslararası örgüt"]),
            ]),
        ]),
    ],
    (11, "physics"): [
        unit("FİZ.11.4", "Dalgalar ve Optik", [
            topic("Dalga Optiği", "FİZ.11.4.1", [
                ("Işığın girişim ve kırınım olaylarını açıklar.", ["girişim", "kırınım"]),
                ("Doppler etkisini yorumlar.", ["Doppler"]),
                ("Dalga hızı, frekans ve dalga boyu ilişkisini uygular.", ["dalga hızı"]),
                ("Ses dalgalarının uygulamalarını (sonar, ultrason) açıklar.", ["sonar", "ultrason"]),
                ("Optik aletlerin (mikroskop, teleskop) çalışma prensiplerini tanır.", ["mikroskop", "teleskop"]),
            ]),
        ]),
    ],
    (11, "turkish_lit"): [
        unit("TDE.11.4", "Anlatı Türleri", [
            topic("Roman ve Hikâye", "TDE.11.4.1", [
                ("Roman ve hikâye türlerinin yapı unsurlarını karşılaştırır.", ["roman", "hikâye"]),
                ("Anlatıcı türlerini (1. tekil, 3. tekil, tanık) ayırt eder.", ["anlatıcı"]),
                ("Zaman ve mekân kullanımını metinlerde analiz eder.", ["zaman", "mekân"]),
            ]),
        ]),
        unit("TDE.11.5", "Şiir İnceleme", [
            topic("Şiir Analizi", "TDE.11.5.1", [
                ("Nazım biçimlerini (gazel, koşma, serbest) tanır.", ["nazım biçimi"]),
                ("Şiirde tema, duygu ve düşünce ilişkisini analiz eder.", ["tema", "duygu"]),
                ("Şiirde ses ve anlam kaynaşmasını yorumlar.", ["ses", "anlam"]),
            ]),
        ]),
        unit("TDE.11.6", "Dil Bilgisi", [
            topic("Cümle Bilgisi", "TDE.11.6.1", [
                ("Cümle türlerini (basit, birleşik, sıralı, bağlı) ayırt eder.", ["cümle türü"]),
                ("Anlatım bozukluklarını tespit eder ve düzeltir.", ["anlatım bozukluğu"]),
                ("Yazım ve noktalama kurallarını metinlerde uygular.", ["yazım"]),
            ]),
        ]),
    ],
    (12, "biology"): [
        unit("BİY.12.4", "Üreme Sistemi", [
            topic("Üreme ve Gelişim", "BİY.12.4.1", [
                ("İnsan üreme sisteminin yapısını açıklar.", ["üreme sistemi"]),
                ("Embriyonik gelişim aşamalarını tanır.", ["embriyo"]),
                ("Üreme sağlığı ve planlamasının önemini değerlendirir.", ["üreme sağlığı"]),
                ("Bitkilerde üreme organlarını ve tozlaşmayı açıklar.", ["tozlaşma"]),
                ("Bitki ve hayvanlarda vejetatif üremeyi karşılaştırır.", ["vejetatif üreme"]),
            ]),
        ]),
    ],
    (12, "chemistry"): [
        unit("KİM.12.4", "Analitik Kimya", [
            topic("Titrasyon ve pH", "KİM.12.4.1", [
                ("Asit-baz titrasyonlarını hesaplar.", ["titrasyon"]),
                ("Tampon çözeltilerin özelliklerini açıklar.", ["tampon"]),
                ("Kimyasal analiz yöntemlerini (spektroskopi, kromatografi) tanır.", ["spektroskopi"]),
                ("Su analizi ve kalite parametrelerini yorumlar.", ["su analizi"]),
                ("Kimyasal atık yönetimini değerlendirir.", ["atık yönetimi"]),
            ]),
        ]),
    ],
    (12, "geography"): [
        unit("COĞ.12.4", "Küresel Ticaret", [
            topic("Ticaret Ağları", "COĞ.12.4.1", [
                ("Küresel ticaret rotalarını harita üzerinde gösterir.", ["ticaret rotası"]),
                ("Türkiye'nin dış ticaret partnerlerini analiz eder.", ["dış ticaret"]),
                ("Lojistik ve ulaşım koridorlarının önemini açıklar.", ["lojistik"]),
            ]),
        ]),
        unit("COĞ.12.5", "Afet Yönetimi", [
            topic("Doğal Afetler", "COĞ.12.5.1", [
                ("Deprem, sel ve yangın risk haritalarını yorumlar.", ["risk haritası"]),
                ("Afet öncesi hazırlık ve sonrası müdahale planlarını açıklar.", ["afet yönetimi"]),
                ("Türkiye'nin afet risk bölgelerini harita üzerinde gösterir.", ["afet riski"]),
            ]),
        ]),
        unit("COĞ.12.6", "Beşerî Coğrafya", [
            topic("Kentsel Coğrafya", "COĞ.12.6.1", [
                ("Türkiye'nin büyük şehirlerinin gelişim süreçlerini analiz eder.", ["kentleşme"]),
                ("Kırsal-kentsel göç dinamiklerini açıklar.", ["göç"]),
            ]),
        ]),
    ],
    (12, "geometry"): [
        unit("GEO.12.4", "Trigonometri", [
            topic("Trigonometrik Uygulamalar", "GEO.12.4.1", [
                ("Trigonometrik fonksiyonları geometrik problemlerde kullanır.", ["trigonometri"]),
                ("Üçgende alan ve yükseklik hesaplar.", ["yükseklik"]),
                ("Gerçek yaşam problemlerinde trigonometri uygular.", ["trigonometri uygulama"]),
            ]),
        ]),
        unit("GEO.12.5", "Analitik Geometri", [
            topic("Konikler", "GEO.12.5.1", [
                ("Elips, hiperbol ve parabol denklemlerini tanır.", ["elips", "hiperbol", "parabol"]),
                ("Koniklerin odak ve doğrudanrix özelliklerini kullanır.", ["odak", "doğrudanrix"]),
                ("Koniklerin gerçek yaşam uygulamalarını açıklar.", ["konik uygulama"]),
            ]),
        ]),
        unit("GEO.12.6", "Ölçme", [
            topic("Geometrik Ölçme", "GEO.12.6.1", [
                ("Açı, uzunluk ve alan ölçme problemlerini çözer.", ["ölçme"]),
                ("Harita ve plan üzerinde ölçek hesaplamaları yapar.", ["ölçek"]),
            ]),
        ]),
    ],
    (12, "history"): [
        unit("TAR.12.4", "Türkiye Cumhuriyeti Tarihi", [
            topic("Cumhuriyet Dönemi", "TAR.12.4.1", [
                ("1960, 1971 ve 1980 darbelerinin neden ve sonuçlarını analiz eder.", ["darbe"]),
                ("Türkiye'nin AB ile ilişkilerini kronolojik sıralar.", ["AB"]),
                ("Türkiye'nin bölgesel politikasını değerlendirir.", ["bölgesel politika"]),
            ]),
        ]),
        unit("TAR.12.5", "Atatürk İlkeleri", [
            topic("İlke ve İnkılaplar", "TAR.12.5.1", [
                ("Cumhuriyetçilik ilkesinin uygulamalarını örnekler.", ["Cumhuriyetçilik"]),
                ("Laiklik ilkesinin toplumsal dönüşümdeki rolünü açıklar.", ["Laiklik"]),
                ("Halkçılık ve Devletçilik ilkelerini karşılaştırır.", ["Halkçılık", "Devletçilik"]),
            ]),
        ]),
    ],
    (12, "math"): [
        unit("M.12.3", "Diziler ve Seriler", [
            topic("Dizi Uygulamaları", "M.12.3.1", [
                ("Aritmetik ve geometrik dizilerin limit davranışını inceler.", ["dizi limiti"]),
                ("Serilerin yakınsaklık kavramını tanır.", ["seri", "yakınsaklık"]),
                ("Dizi ve serilerle ilgili problemleri çözer.", ["dizi problemi"]),
            ]),
        ]),
        unit("M.12.4", "Fonksiyon Uygulamaları", [
            topic("Modelleme", "M.12.4.1", [
                ("Üstel ve logaritmik fonksiyonlarla büyüme modelleri kurar.", ["büyüme modeli"]),
                ("Türev ve integral ile optimizasyon problemlerini çözer.", ["optimizasyon"]),
            ]),
        ]),
    ],
    (12, "physics"): [
        unit("FİZ.12.4", "Modern Fizik Uygulamaları", [
            topic("Teknoloji ve Fizik", "FİZ.12.4.1", [
                ("Lazer teknolojisinin fiziksel prensiplerini açıklar.", ["lazer"]),
                ("Yarı iletken teknolojisinin temellerini tanır.", ["yarı iletken"]),
                ("Nanoteknolojinin fizik temellerini yorumlar.", ["nanoteknoloji"]),
                ("Tıpta kullanılan radyasyon türlerini ayırt eder.", ["radyasyon"]),
                ("Modern fizik buluşlarının günlük yaşamdaki etkilerini değerlendirir.", ["modern fizik"]),
            ]),
        ]),
    ],
    (12, "turkish_lit"): [
        unit("TDE.12.4", "Hikâye ve Roman", [
            topic("Anlatı Türleri", "TDE.12.4.1", [
                ("Türk hikâyesinin gelişim evrelerini açıklar.", ["hikâye gelişimi"]),
                ("Roman türlerini (psikolojik, tarihî, toplumsal) ayırt eder.", ["roman türü"]),
                ("Anlatı tekniklerini (iç monolog, akış bilinci) metinlerde tespit eder.", ["iç monolog"]),
            ]),
        ]),
        unit("TDE.12.5", "Şiir", [
            topic("Şiir Gelişimi", "TDE.12.5.1", [
                ("Türk şiirinde hece ve aruz ölçülerini karşılaştırır.", ["hece", "aruz"]),
                ("Serbest şiirin özelliklerini açıklar.", ["serbest şiir"]),
                ("Şiirde imgeleri ve sembolleri analiz eder.", ["imge", "sembol"]),
            ]),
        ]),
        unit("TDE.12.6", "Tiyatro", [
            topic("Tiyatro Türü", "TDE.12.6.1", [
                ("Tiyatro türlerini (trajedi, komedi, dram) tanır.", ["tiyatro türü"]),
                ("Tiyatro metninde diyalog ve sahne yönergesini analiz eder.", ["diyalog", "sahne"]),
            ]),
        ]),
        unit("TDE.12.7", "Dil Bilgisi", [
            topic("Anlatım", "TDE.12.7.1", [
                ("Cümle çeşitlerini ve anlatım biçimlerini metinlerde belirler.", ["anlatım biçimi"]),
                ("Yazım ve noktalama kurallarını uygular.", ["yazım"]),
            ]),
        ]),
    ],
}


def apply_supplements(all_grades):
    result = {}
    for grade, subjects in all_grades.items():
        result[grade] = {}
        for key, data in subjects.items():
            extra = SUPPLEMENT.get((grade, key), [])
            result[grade][key] = merge_units(data, extra) if extra else data
    return result
