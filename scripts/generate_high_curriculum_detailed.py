#!/usr/bin/env python3
"""Generate detailed MEB-aligned high school curriculum JSON files for Rotix."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "assets" / "data" / "curriculum" / "high"


def write(path: Path, data: dict) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return sum(len(t["outcomes"]) for u in data["units"] for t in u["topics"])


def unit(code, name, topics):
    return {"unit_code": code, "unit_name": name, "topics": topics}


def topic(name, prefix, items):
    outcomes = []
    for i, (desc, kw) in enumerate(items, 1):
        outcomes.append({"code": f"{prefix}.{i}", "description": desc, "keywords": kw})
    return {"topic_name": name, "outcomes": outcomes}


def base(grade, subject, ref, units):
    return {"grade": grade, "subject": subject, "program_ref": ref, "units": units}


# ─── GRADE 9 ───────────────────────────────────────────────────────────────

GRADE_9 = {
    "math": base(9, "Matematik", "MEB Matematik Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("M.9.1", "Mantık", [
            topic("Önermeler ve Bileşik Önermeler", "M.9.1.1", [
                ("Önerme kavramını tanır; doğruluk değerini belirler.", ["önerme", "doğruluk değeri"]),
                ("Bileşik önermeleri ve bağlaçları (ve, veya, ya da) kullanır.", ["bileşik önerme", "bağlaç"]),
                ("Koşullu önermeleri tanır; koşul ve sonuç ilişkisini açıklar.", ["koşullu önerme", "koşul"]),
                ("Önermelerin tersini, karşıtını ve karşıt tersini bulur.", ["ters", "karşıt"]),
            ]),
            topic("Niceleyiciler ve İspat", "M.9.1.2", [
                ("Evrensel ve varlıksal niceleyicileri tanır; sembollerle ifade eder.", ["niceleyici", "∀", "∃"]),
                ("Niceleyicili önermelerin doğruluk değerini belirler.", ["niceleyici", "doğruluk"]),
                ("Doğrudan ispat, tersini alarak ispat ve tümevarım yöntemlerini açıklar.", ["ispat", "tümevarım"]),
                ("Matematiksel ifadeleri mantık sembolleriyle temsil eder.", ["mantık sembolü"]),
            ]),
        ]),
        unit("M.9.2", "Kümeler", [
            topic("Küme Kavramı ve Gösterim", "M.9.2.1", [
                ("Küme kavramını tanır; eleman, alt küme ve eşit küme ilişkilerini açıklar.", ["küme", "eleman", "alt küme"]),
                ("Kümeleri liste, ortak özellik ve Venn şeması ile gösterir.", ["Venn şeması", "liste yöntemi"]),
                ("Boş küme, evrensel küme ve sonlu-sonsuz küme kavramlarını ayırt eder.", ["boş küme", "evrensel küme"]),
            ]),
            topic("Küme İşlemleri", "M.9.2.2", [
                ("Birleşim, kesişim, fark ve tümleyen işlemlerini yapar.", ["birleşim", "kesişim", "fark"]),
                ("De Morgan kurallarını uygular.", ["De Morgan"]),
                ("Küme işlemleriyle ilgili problemleri çözer.", ["küme problemi"]),
            ]),
        ]),
        unit("M.9.3", "Denklem ve Eşitsizlikler", [
            topic("Sayı Kümeleri", "M.9.3.1", [
                ("Doğal, tam, rasyonel, irrasyonel ve reel sayı kümelerini tanır.", ["sayı kümeleri", "reel sayı"]),
                ("Sayı kümeleri arasındaki ilişkileri Venn şeması ile gösterir.", ["Venn", "sayı kümeleri"]),
            ]),
            topic("Üslü ve Köklü İfadeler", "M.9.3.2", [
                ("Üslü ifadelerle işlem yapar; üs kurallarını uygular.", ["üslü ifade", "üs kuralı"]),
                ("Köklü ifadelerle işlem yapar; sadeleştirme ve rasyonelleştirme yapar.", ["köklü ifade", "rasyonelleştirme"]),
                ("Üslü ve köklü ifadeleri birbirine dönüştürür.", ["dönüşüm"]),
            ]),
            topic("Denklem ve Eşitsizlikler", "M.9.3.3", [
                ("Birinci dereceden bir ve iki bilinmeyenli denklem sistemlerini çözer.", ["denklem sistemi"]),
                ("Mutlak değer içeren birinci dereceden denklemleri çözer.", ["mutlak değer", "denklem"]),
                ("Birinci dereceden bir ve iki bilinmeyenli eşitsizlikleri çözer; sayı doğrusunda gösterir.", ["eşitsizlik", "sayı doğrusu"]),
                ("Denklem ve eşitsizliklerle ilgili problemleri çözer.", ["problem çözme"]),
            ]),
        ]),
        unit("M.9.4", "Üçgenler", [
            topic("Üçgende Temel Kavramlar", "M.9.4.1", [
                ("Üçgenin elemanlarını (kenar, açı, kenarortay, açıortay, yükseklik) tanır.", ["üçgen", "kenarortay", "açıortay"]),
                ("Üçgenin iç ve dış açılarının özelliklerini kullanır.", ["iç açı", "dış açı"]),
                ("Üçgen eşitsizliğini uygular.", ["üçgen eşitsizliği"]),
            ]),
            topic("Üçgende Eşlik ve Benzerlik", "M.9.4.2", [
                ("Üçgenlerde eşlik koşullarını (KKK, AKA, KAK) uygular.", ["eşlik", "KKK"]),
                ("Üçgenlerde benzerlik koşullarını (AA, KAK, KKA) uygular.", ["benzerlik", "AA"]),
                ("Benzer üçgenlerde oran-orantı ilişkilerini kullanır.", ["oran", "benzerlik oranı"]),
            ]),
            topic("Üçgende Alan", "M.9.4.3", [
                ("Üçgenin alanını farklı formüllerle hesaplar.", ["alan", "formül"]),
                ("Benzer üçgenlerin alan oranını kullanır.", ["alan oranı"]),
            ]),
        ]),
        unit("M.9.5", "Veri", [
            topic("Merkezi Eğilim Ölçüleri", "M.9.5.1", [
                ("Aritmetik ortalama, ortanca ve mod kavramlarını hesaplar.", ["ortalama", "ortanca", "mod"]),
                ("Veri setlerinde merkezi eğilim ölçülerini karşılaştırır.", ["merkezi eğilim"]),
            ]),
            topic("Veri Analizi", "M.9.5.2", [
                ("Verileri sıklık tablosu ve histogram ile gösterir.", ["histogram", "sıklık tablosu"]),
                ("Veri setlerinde açıklık ve standart sapmayı yorumlar.", ["açıklık", "standart sapma"]),
                ("Gerçek yaşam verilerini analiz ederek yorum yapar.", ["veri analizi", "yorum"]),
            ]),
        ]),
    ]),
    "physics": base(9, "Fizik", "MEB Fizik Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("FİZ.9.1", "Fizik Bilimine Giriş", [
            topic("Fizik ve Bilimsel Yöntem", "FİZ.9.1.1", [
                ("Fiziğin tanımını, alt dallarını ve diğer bilimlerle ilişkisini açıklar.", ["fizik", "alt dal"]),
                ("Bilimsel yöntemin aşamalarını sıralar; gözlem, hipotez ve deney kavramlarını kullanır.", ["bilimsel yöntem", "hipotez"]),
                ("Fizikte kullanılan temel büyüklükleri, birimleri ve SI sistemini tanır.", ["SI birim", "büyüklük"]),
                ("Ölçme belirsizliği ve anlamlı rakam kavramlarını uygular.", ["ölçme", "anlamlı rakam"]),
            ]),
        ]),
        unit("FİZ.9.2", "Madde ve Özellikleri", [
            topic("Maddenin Yapısı", "FİZ.9.2.1", [
                ("Maddenin tanecikli yapısını açıklar; atom, molekül kavramlarını kullanır.", ["tanecik", "atom", "molekül"]),
                ("Saf madde ve karışım ayrımını yapar; homojen-heterojen karışımları ayırt eder.", ["saf madde", "karışım"]),
            ]),
            topic("Yoğunluk ve Basınç", "FİZ.9.2.2", [
                ("Kütle, hacim ve yoğunluk kavramlarını tanır; ρ=m/V formülünü uygular.", ["yoğunluk", "kütle", "hacim"]),
                ("Katı, sıvı ve gazlarda basınç kavramını açıklar.", ["basınç"]),
                ("Açık hava basıncını ve Pascal prensibini yorumlar.", ["açık hava basıncı", "Pascal"]),
            ]),
        ]),
        unit("FİZ.9.3", "Hareket ve Kuvvet", [
            topic("Hareket", "FİZ.9.3.1", [
                ("Konum, yer değiştirme, hız ve ivme kavramlarını ayırt eder.", ["konum", "hız", "ivme"]),
                ("Düzgün doğrusal hareket grafiklerini yorumlar.", ["hız-zaman grafiği"]),
                ("Serbest düşme hareketini açıklar.", ["serbest düşme"]),
            ]),
            topic("Kuvvet ve Newton Yasaları", "FİZ.9.3.2", [
                ("Kuvvet kavramını tanır; vektörel toplamayı uygular.", ["kuvvet", "vektör"]),
                ("Newton'un hareket yasalarını açıklar ve problemlerde uygular.", ["Newton yasaları"]),
                ("Sürtünme kuvvetini ve etkilerini yorumlar.", ["sürtünme"]),
            ]),
        ]),
        unit("FİZ.9.4", "Enerji", [
            topic("İş ve Enerji", "FİZ.9.4.1", [
                ("İş kavramını tanır; W=F·s formülünü uygular.", ["iş", "kuvvet"]),
                ("Kinetik ve potansiyel enerji kavramlarını açıklar.", ["kinetik enerji", "potansiyel enerji"]),
                ("Enerjinin korunumu ilkesini kullanır.", ["enerji korunumu"]),
                ("Güç kavramını tanır; P=W/t ilişkisini uygular.", ["güç"]),
            ]),
        ]),
        unit("FİZ.9.5", "Isı ve Sıcaklık", [
            topic("Isı ve Sıcaklık", "FİZ.9.5.1", [
                ("Isı ve sıcaklık kavramlarını ayırt eder.", ["ısı", "sıcaklık"]),
                ("Hal değişimlerinde ısı alışverişini Q=m·L ve Q=m·c·ΔT formülleriyle hesaplar.", ["hal değişimi", "ısı"]),
                ("Isı iletim yollarını (iletim, taşınım, ışınım) açıklar.", ["ısı iletimi"]),
            ]),
        ]),
        unit("FİZ.9.6", "Elektrostatik", [
            topic("Elektrik Yükü", "FİZ.9.6.1", [
                ("Elektrik yükü ve yük çeşitlerini tanır; Coulomb yasasını uygular.", ["elektrik yükü", "Coulomb"]),
                ("İletken ve yalıtkan maddeleri ayırt eder.", ["iletken", "yalıtkan"]),
                ("Elektrik alan kavramını açıklar.", ["elektrik alan"]),
                ("Elektroskop çalışma prensibini yorumlar.", ["elektroskop"]),
            ]),
        ]),
    ]),
    "chemistry": base(9, "Kimya", "MEB Kimya Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("KİM.9.1", "Kimya Bilimi", [
            topic("Kimyanın Temelleri", "KİM.9.1.1", [
                ("Kimyanın tanımını, alt dallarını ve günlük yaşamdaki önemini açıklar.", ["kimya", "alt dal"]),
                ("Laboratuvar güvenlik kurallarını uygular.", ["laboratuvar güvenliği"]),
                ("Kimyasal madde ve karışım ayrımını yapar.", ["kimyasal madde"]),
                ("Simge, formül ve denklem kavramlarını kullanır.", ["formül", "denklem"]),
            ]),
        ]),
        unit("KİM.9.2", "Atom ve Periyodik Sistem", [
            topic("Atom Modelleri", "KİM.9.2.1", [
                ("Atom teorilerinin tarihsel gelişimini sıralar (Dalton, Thomson, Rutherford, Bohr).", ["atom modeli", "Bohr"]),
                ("Atom altı parçacıkları (proton, nötron, elektron) tanır.", ["proton", "nötron", "elektron"]),
                ("İzotop kavramını açıklar.", ["izotop"]),
            ]),
            topic("Periyodik Sistem", "KİM.9.2.2", [
                ("Periyodik tablonun düzenini (grup, periyot) açıklar.", ["periyodik tablo", "grup"]),
                ("Periyodik özelliklerdeki (atom yarıçapı, iyonlaşma enerjisi) eğilimleri yorumlar.", ["periyodik özellik"]),
                ("Element sembollerini ve isimlerini kullanır.", ["element sembolü"]),
            ]),
        ]),
        unit("KİM.9.3", "Kimyasal Türler Arası Etkileşimler", [
            topic("Kimyasal Bağlar", "KİM.9.3.1", [
                ("İyonik, kovalent ve metalik bağları tanır; oluşum mekanizmalarını açıklar.", ["iyonik bağ", "kovalent bağ"]),
                ("Lewis nokta yapılarını çizer.", ["Lewis yapısı"]),
                ("Molekül polaritesini yorumlar.", ["polarite"]),
            ]),
            topic("Etkileşim Türleri", "KİM.9.3.2", [
                ("Van der Waals, hidrojen bağı ve dipol-dipol etkileşimlerini ayırt eder.", ["hidrojen bağı", "Van der Waals"]),
                ("Etkileşim türlerinin maddelerin fiziksel özelliklerine etkisini açıklar.", ["fiziksel özellik"]),
            ]),
        ]),
        unit("KİM.9.4", "Maddenin Halleri", [
            topic("Gaz, Sıvı ve Katı", "KİM.9.4.1", [
                ("Gazların özelliklerini tanır; ideal gaz yasasını uygular.", ["ideal gaz", "basınç"]),
                ("Sıvılarda yüzey gerilimi ve viskoziteyi açıklar.", ["viskozite", "yüzey gerilimi"]),
                ("Katılarda kristal yapıları tanır.", ["kristal yapı"]),
                ("Hal değişimlerini grafiklerle yorumlar.", ["hal değişimi"]),
            ]),
        ]),
        unit("KİM.9.5", "Doğa ve Kimya", [
            topic("Çevre Kimyası", "KİM.9.5.1", [
                ("Su kaynaklarının kirlenmesi ve arıtma yöntemlerini açıklar.", ["su kirliliği", "arıtma"]),
                ("Hava kirliliği kaynaklarını ve etkilerini yorumlar.", ["hava kirliliği"]),
                ("Geri dönüşüm ve sürdürülebilir kimya uygulamalarını değerlendirir.", ["geri dönüşüm", "sürdürülebilirlik"]),
            ]),
        ]),
    ]),
    "biology": base(9, "Biyoloji", "MEB Biyoloji Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("BİY.9.1", "Yaşam Bilimi Biyoloji", [
            topic("Biyolojinin Kapsamı", "BİY.9.1.1", [
                ("Biyolojinin tanımını ve alt dallarını açıklar.", ["biyoloji", "alt dal"]),
                ("Canlıların ortak özelliklerini sıralar.", ["canlı özellikleri"]),
                ("Bilimsel yöntemi biyolojide uygular.", ["bilimsel yöntem"]),
            ]),
        ]),
        unit("BİY.9.2", "Hücre", [
            topic("Hücre Yapısı", "BİY.9.2.1", [
                ("Prokaryot ve ökaryot hücre ayrımını yapar.", ["prokaryot", "ökaryot"]),
                ("Hücre zarının yapısını ve madde geçişlerini açıklar.", ["hücre zarı", "osmos"]),
                ("Organellerin (mitokondri, ribozom, ER, Golgi, kloroplast) yapı ve işlevlerini tanır.", ["organeller"]),
            ]),
            topic("Hücre Bölünmesi", "BİY.9.2.2", [
                ("Mitoz ve mayoz bölünme aşamalarını karşılaştırır.", ["mitoz", "mayoz"]),
                ("Hücre döngüsünü açıklar.", ["hücre döngüsü"]),
            ]),
        ]),
        unit("BİY.9.3", "Canlılar Dünyası", [
            topic("Canlıların Sınıflandırılması", "BİY.9.3.1", [
                ("Beş âlem sistemini (Monera, Protista, Fungi, Plantae, Animalia) tanır.", ["âlem", "sınıflandırma"]),
                ("Virüslerin özelliklerini ve canlı- cansız sınırındaki konumunu açıklar.", ["virüs"]),
                ("Taksonomi basamaklarını (cins, tür, familya) sıralar.", ["taksonomi"]),
            ]),
            topic("Bitki ve Hayvan Çeşitliliği", "BİY.9.3.2", [
                ("Bitki gruplarının (yosun, ot, çalı, ağaç) temel özelliklerini ayırt eder.", ["bitki grupları"]),
                ("Omurgalı ve omurgasız hayvan gruplarını tanır.", ["omurgalı", "omurgasız"]),
            ]),
        ]),
        unit("BİY.9.4", "Dünya'mız", [
            topic("Ekosistem", "BİY.9.4.1", [
                ("Ekosistem bileşenlerini (biyotik, abiyotik) tanır.", ["ekosistem", "biyotik"]),
                ("Besin zinciri ve besin ağını çizer.", ["besin zinciri"]),
                ("Madde döngülerini (karbon, azot, su) açıklar.", ["madde döngüsü"]),
                ("Biyoçeşitliliğin önemini ve tehditlerini değerlendirir.", ["biyoçeşitlilik"]),
            ]),
        ]),
    ]),
    "turkish_lit": base(9, "Türk Dili ve Edebiyatı", "MEB Türk Dili ve Edebiyatı Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("TDE.9.1", "Giriş", [
            topic("Dil ve Edebiyat", "TDE.9.1.1", [
                ("Dilin tanımını, işlevlerini ve edebiyatla ilişkisini açıklar.", ["dil", "edebiyat"]),
                ("Edebi metin ile bilgi metni ayrımını yapar.", ["edebi metin"]),
                ("Türk edebiyatının dönemlerini kronolojik sıralar.", ["edebiyat dönemi"]),
            ]),
        ]),
        unit("TDE.9.2", "Hikâye", [
            topic("Hikâye Türü", "TDE.9.2.1", [
                ("Hikâyenin yapı unsurlarını (olay, kişi, yer, zaman, anlatıcı) belirler.", ["hikâye", "anlatıcı"]),
                ("Hikâye türlerini (olay, durum, modern) ayırt eder.", ["hikâye türü"]),
                ("Seçilen hikâyelerde tema ve anlatım tekniklerini analiz eder.", ["tema", "anlatım"]),
            ]),
        ]),
        unit("TDE.9.3", "Şiir", [
            topic("Şiir Türü", "TDE.9.3.1", [
                ("Şiirin yapı unsurlarını (dize, bent, kafiye, redif, ölçü) tanır.", ["şiir", "kafiye", "ölçü"]),
                ("Şiir türlerini (lirik, epik, didaktik) ayırt eder.", ["şiir türü"]),
                ("Söz sanatlarını (benzetme, kişileştirme, abartma) metinde tespit eder.", ["söz sanatı"]),
            ]),
        ]),
        unit("TDE.9.4", "Masal, Fabl ve Destan", [
            topic("Sözlü Anlatı Türleri", "TDE.9.4.1", [
                ("Masal, fabl ve destanın özelliklerini karşılaştırır.", ["masal", "fabl", "destan"]),
                ("Bu türlerdeki kalıp ifadeleri ve anlatım özelliklerini belirler.", ["kalıp ifade"]),
            ]),
        ]),
        unit("TDE.9.5", "Öğretici Metinler", [
            topic("Deneme ve Makale", "TDE.9.5.1", [
                ("Deneme ve makale türlerinin özelliklerini açıklar.", ["deneme", "makale"]),
                ("Öğretici metinlerde ana düşünce ve yardımcı düşünceleri belirler.", ["ana düşünce"]),
                ("Eleştiri yazısının temel özelliklerini tanır.", ["eleştiri"]),
            ]),
        ]),
    ]),
    "history": base(9, "Tarih", "MEB Tarih Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("TAR.9.1", "Tarih Bilimine Giriş", [
            topic("Tarih ve Yöntem", "TAR.9.1.1", [
                ("Tarihin tanımını ve diğer bilimlerle ilişkisini açıklar.", ["tarih bilimi"]),
                ("Tarih kaynaklarını (yazılı, sözlü, arkeolojik) sınıflandırır.", ["tarih kaynağı"]),
                ("Tarihte zaman ve mekân kavramlarını kullanır.", ["zaman", "mekân"]),
                ("Tarih yazıcılığı ve yorum farkını ayırt eder.", ["tarih yazıcılığı"]),
            ]),
        ]),
        unit("TAR.9.2", "İlk ve Orta Çağlarda Türk Dünyası", [
            topic("İlk Türk Devletleri", "TAR.9.2.1", [
                ("Orta Asya'daki ilk Türk topluluklarını ve göçlerini açıklar.", ["Orta Asya", "göç"]),
                ("Hun, Göktürk ve Uygur devletlerinin siyasi ve kültürel özelliklerini sıralar.", ["Hun", "Göktürk", "Uygur"]),
                ("Orhun Yazıtları'nın önemini değerlendirir.", ["Orhun Yazıtları"]),
            ]),
        ]),
        unit("TAR.9.3", "İslam Tarihi", [
            topic("İslamiyet'in Doğuşu", "TAR.9.3.1", [
                ("Hz. Muhammed döneminde İslamiyet'in yayılışını açıklar.", ["İslamiyet", "Hz. Muhammed"]),
                ("Dört Halife dönemindeki gelişmeleri sıralar.", ["Dört Halife"]),
                ("Emevi ve Abbasi devletlerinin temel özelliklerini karşılaştırır.", ["Emevi", "Abbasi"]),
            ]),
        ]),
        unit("TAR.9.4", "Türk-İslam Devletleri", [
            topic("Karahanlı, Gazneli, Selçuklu", "TAR.9.4.1", [
                ("Karahanlıların İslamiyet'i kabulünün sonuçlarını açıklar.", ["Karahanlı"]),
                ("Büyük Selçuklu Devleti'nin kuruluşu ve Malazgirt Savaşı'nın önemini değerlendirir.", ["Selçuklu", "Malazgirt"]),
                ("Anadolu Selçuklu Devleti'nin siyasi ve kültürel mirasını tanır.", ["Anadolu Selçuklu"]),
            ]),
        ]),
    ]),
    "geography": base(9, "Coğrafya", "MEB Coğrafya Dersi Öğretim Programı (Lise, 9. Sınıf)", [
        unit("COĞ.9.1", "Doğa ve İnsan", [
            topic("Coğrafyanın Konusu", "COĞ.9.1.1", [
                ("Coğrafyanın tanımını ve alt dallarını (fiziki, beşerî) açıklar.", ["coğrafya", "fiziki", "beşerî"]),
                ("Coğrafyanın günlük yaşamdaki işlevlerini örnekler.", ["coğrafya uygulaması"]),
            ]),
        ]),
        unit("COĞ.9.2", "Dünya'nın Şekli ve Hareketleri", [
            topic("Dünya'nın Konumu", "COĞ.9.2.1", [
                ("Dünya'nın şeklini ve sonuçlarını açıklar.", ["geoit", "Dünya şekli"]),
                ("Dünya'nın dönme ve dolanma hareketlerinin etkilerini yorumlar.", ["dönme", "dolanma"]),
                ("Koordinat sistemini (enlem, boylam) kullanır.", ["enlem", "boylam"]),
                ("Saat dilimlerini açıklar.", ["saat dilimi"]),
            ]),
        ]),
        unit("COĞ.9.3", "Atmosfer ve İklim", [
            topic("İklim Elemanları", "COĞ.9.3.1", [
                ("Sıcaklık, basınç, nem, rüzgâr ve yağış kavramlarını açıklar.", ["sıcaklık", "basınç", "yağış"]),
                ("İklim tiplerini (tropikal, ılıman, kutup) ayırt eder.", ["iklim tipi"]),
                ("Türkiye'de görülen iklim tiplerini tanır.", ["Türkiye iklimi"]),
            ]),
        ]),
        unit("COĞ.9.4", "Yer Şekilleri", [
            topic("Dış ve İç Kuvvetler", "COĞ.9.4.1", [
                ("Dış kuvvetlerin (akarsu, rüzgâr, buzul) yer şekilleri oluşturma süreçlerini açıklar.", ["dış kuvvet", "erozyon"]),
                ("İç kuvvetlerin (deprem, volkanizma, dağ oluşumu) etkilerini yorumlar.", ["deprem", "volkanizma"]),
                ("Türkiye'nin yer şekillerini harita üzerinde gösterir.", ["Türkiye yer şekilleri"]),
            ]),
        ]),
        unit("COĞ.9.5", "Nüfus", [
            topic("Nüfus Özellikleri", "COĞ.9.5.1", [
                ("Nüfus artış hızı ve piramitlerini yorumlar.", ["nüfus artışı", "nüfus piramidi"]),
                ("Göç türlerini ve nedenlerini açıklar.", ["göç"]),
                ("Türkiye'nin nüfus dağılışını harita üzerinde analiz eder.", ["nüfus dağılışı"]),
            ]),
        ]),
    ]),
}

# Due to file size, remaining grades defined in generate_high_curriculum_data.py
from generate_high_curriculum_data import GRADE_10, GRADE_11, GRADE_12  # noqa: E402
from generate_high_curriculum_supplement import apply_supplements  # noqa: E402

ALL_GRADES = apply_supplements({
    9: GRADE_9,
    10: GRADE_10,
    11: GRADE_11,
    12: GRADE_12,
})

FILE_MAP = {
    "math": "math",
    "geometry": "geometry",
    "physics": "physics",
    "chemistry": "chemistry",
    "biology": "biology",
    "turkish_lit": "turkish_lit",
    "history": "history",
    "geography": "geography",
}


def main():
    stats = []
    for grade, subjects in ALL_GRADES.items():
        for key, data in subjects.items():
            fname = f"grade_{grade}_{FILE_MAP[key]}.json"
            n = write(ROOT / fname, data)
            stats.append((fname, n))
    print(f"Generated {len(stats)} files, {sum(s[1] for s in stats)} total outcomes\n")
    for fname, n in sorted(stats):
        print(f"  {fname}: {n} outcomes")


if __name__ == "__main__":
    main()
