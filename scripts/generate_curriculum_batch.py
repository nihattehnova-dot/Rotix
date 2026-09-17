#!/usr/bin/env python3
"""Generate Rotix curriculum JSON files — all core subjects."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "assets" / "data" / "curriculum"


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
    g = grade if isinstance(grade, str) else grade
    return {"grade": g, "subject": subject, "program_ref": ref, "units": units}


# ─── PRIMARY: Hayat Bilgisi 1-3 ───
LIFE = {
    1: [
        unit("HB.1.1", "Ben ve Okulum", [
            topic("Okula Uyum", "HB.1.1.1", [
                ("Okul kurallarını ve sınıf içi sorumluluklarını açıklar.", ["okul", "sorumluluk"]),
                ("Kendini tanıtır; duygu ve ihtiyaçlarını ifade eder.", ["duygu", "iletişim"]),
            ]),
            topic("Güvenli Okul", "HB.1.1.2", [
                ("Okulda güvenli ve tehlikeli davranışları ayırt eder.", ["güvenlik"]),
            ]),
        ]),
        unit("HB.1.2", "Sağlıklı Yaşam", [
            topic("Temizlik ve Beslenme", "HB.1.2.1", [
                ("Kişisel temizlik alışkanlıklarını uygular.", ["temizlik", "sağlık"]),
                ("Sağlıklı beslenme ile ilgili basit seçimler yapar.", ["beslenme"]),
            ]),
        ]),
        unit("HB.1.3", "Ailem ve Toplum", [
            topic("Aile İçi İlişkiler", "HB.1.3.1", [
                ("Aile bireylerinin rollerini tanır.", ["aile"]),
                ("Yardımlaşma ve saygı davranışlarını örnekler.", ["saygı", "yardımlaşma"]),
            ]),
        ]),
    ],
    2: [
        unit("HB.2.1", "Ben ve Çevrem", [
            topic("Duygularım", "HB.2.1.1", [
                ("Duygularını tanır ve uygun ifade yollarını kullanır.", ["duygu"]),
                ("Arkadaşlık ilişkilerinde empati gösterir.", ["empati", "arkadaşlık"]),
            ]),
        ]),
        unit("HB.2.2", "Sağlıklı Yaşam", [
            topic("Hareket ve Dinlenme", "HB.2.2.1", [
                ("Günlük hareket ve dinlenme dengesinin önemini açıklar.", ["spor", "dinlenme"]),
                ("Tehlikeli maddelerden uzak durma kurallarını bilir.", ["güvenlik"]),
            ]),
        ]),
        unit("HB.2.3", "Toplumda Yaşam", [
            topic("Kurallar ve Sorumluluk", "HB.2.3.1", [
                ("Toplumda uyulması gereken temel kuralları açıklar.", ["kural", "toplum"]),
            ]),
        ]),
    ],
    3: [
        unit("HB.3.1", "Kişisel Gelişim", [
            topic("Hedef ve Plan", "HB.3.1.1", [
                ("Kısa vadeli hedef belirler ve plan yapar.", ["hedef", "plan"]),
                ("Zamanını etkin kullanmaya yönelik basit stratejiler uygular.", ["zaman yönetimi"]),
            ]),
        ]),
        unit("HB.3.2", "Sağlıklı Yaşam", [
            topic("Sağlık ve Çevre", "HB.3.2.1", [
                ("Sağlıklı yaşam bileşenlerini (beslenme, uyku, hareket) ilişkilendirir.", ["sağlık"]),
                ("Çevreyi koruma konusunda sorumluluk alır.", ["çevre"]),
            ]),
        ]),
        unit("HB.3.3", "Vatandaşlık", [
            topic("Hak ve Sorumluluk", "HB.3.3.1", [
                ("Temel hak ve sorumlulukları örneklerle açıklar.", ["hak", "sorumluluk"]),
                ("Atatürk ve Millî Mücadele ile ilgili temel bilgileri ifade eder.", ["Atatürk"]),
            ]),
        ]),
    ],
}

# ─── PRIMARY: Fen 3-4, Sosyal 4 ───
SCIENCE_PRIMARY = {
    3: [
        unit("F.3.1", "Canlılar ve Yaşam", [
            topic("Canlıları Tanıma", "F.3.1.1", [
                ("Canlıların ortak özelliklerini açıklar.", ["canlı", "özellik"]),
                ("Bitki ve hayvanları gözleme dayalı sınıflandırır.", ["sınıflama"]),
            ]),
            topic("Vücudumuz", "F.3.1.2", [
                ("Vücut sistemlerinin temel işlevlerini açıklar.", ["vücut", "sağlık"]),
            ]),
        ]),
        unit("F.3.2", "Madde ve Doğa", [
            topic("Maddenin Halleri", "F.3.2.1", [
                ("Maddenin katı, sıvı ve gaz hallerini örnekler.", ["madde", "hal"]),
            ]),
            topic("Isı ve Sıcaklık", "F.3.2.2", [
                ("Isı ve sıcaklık kavramlarını ayırt eder.", ["ısı", "sıcaklık"]),
            ]),
        ]),
        unit("F.3.3", "Fiziksel Olaylar", [
            topic("Işık ve Ses", "F.3.3.1", [
                ("Işığın ve sesin yayılma özelliklerini açıklar.", ["ışık", "ses"]),
            ]),
            topic("Kuvvet ve Hareket", "F.3.3.2", [
                ("Kuvvetin cisimler üzerindeki etkilerini gözlemler.", ["kuvvet", "hareket"]),
            ]),
        ]),
    ],
    4: [
        unit("F.4.1", "Canlılar ve Yaşam", [
            topic("Besin Zinciri", "F.4.1.1", [
                ("Besin zincirindeki canlıları ve ilişkileri açıklar.", ["besin zinciri", "ekosistem"]),
            ]),
            topic("Vücut Sistemleri", "F.4.1.2", [
                ("Destek-hareket, sindirim ve dolaşım sistemlerinin işlevlerini açıklar.", ["vücut sistemleri"]),
            ]),
        ]),
        unit("F.4.2", "Madde ve Değişim", [
            topic("Maddenin Özellikleri", "F.4.2.1", [
                ("Maddenin ölçülebilir özelliklerini (kütle, hacim) kullanır.", ["kütle", "hacim"]),
            ]),
            topic("Isı ve Maddenin Hal Değişimi", "F.4.2.2", [
                ("Isı alışverişinde maddenin hal değişimini açıklar.", ["erime", "donma", "buharlaşma"]),
            ]),
        ]),
        unit("F.4.3", "Dünya ve Evren", [
            topic("Dünya ve Hareketleri", "F.4.3.1", [
                ("Dünya'nın dönme ve dolanma hareketlerinin sonuçlarını açıklar.", ["gece gündüz", "mevsim"]),
            ]),
            topic("Basit Elektrik Devreleri", "F.4.3.2", [
                ("Basit elektrik devresi kurar ve bileşenlerini tanır.", ["elektrik", "devre"]),
            ]),
        ]),
    ],
}

SOCIAL_PRIMARY = {
    4: [
        unit("SB.4.1", "Birey ve Toplum", [
            topic("Kimlik ve Kültür", "SB.4.1.1", [
                ("Kültürel ögeleri tanır ve saygı duyar.", ["kültür", "kimlik"]),
            ]),
        ]),
        unit("SB.4.2", "Yaşadığım Yer", [
            topic("Harita ve Yön", "SB.4.2.1", [
                ("Harita sembollerini okur; yön bulma yöntemlerini kullanır.", ["harita", "yön"]),
            ]),
            topic("Yaşadığım İl ve Bölge", "SB.4.2.2", [
                ("Yaşadığı il ve bölgenin fiziki ve beşerî özelliklerini açıklar.", ["il", "bölge"]),
            ]),
        ]),
        unit("SB.4.3", "Sosyal Yaşam", [
            topic("Ekonomik Faaliyetler", "SB.4.3.1", [
                ("Temel ekonomik faaliyet türlerini (tarım, sanayi, hizmet) ayırt eder.", ["ekonomi"]),
            ]),
            topic("Demokratik Yaşam", "SB.4.3.2", [
                ("Demokratik değerleri ve katılımın önemini açıklar.", ["demokrasi"]),
            ]),
        ]),
    ],
}

# ─── MIDDLE 5-8: Fen & Sosyal (compact but complete units) ───
def middle_science(g):
    return [
        unit(f"F.{g}.1", "Canlılar ve Yaşam", [
            topic("Hücre ve Sistemler", f"F.{g}.1.1", [
                ("Hücre yapısını ve canlıların sınıflandırılmasını açıklar.", ["hücre"]),
                ("Canlılarda sistemler arası ilişkiyi yorumlar.", ["sistem"]),
            ]),
        ]),
        unit(f"F.{g}.2", "Madde ve Doğa", [
            topic("Madde ve Isı", f"F.{g}.2.1", [
                ("Saf madde ve karışım ayrımını yapar.", ["madde", "karışım"]),
                ("Isı iletimi ve sıcaklık değişimini açıklar.", ["ısı"]),
            ]),
        ]),
        unit(f"F.{g}.3", "Fiziksel Olaylar", [
            topic("Kuvvet ve Enerji", f"F.{g}.3.1", [
                ("Kuvvet, iş ve enerji ilişkisini açıklar.", ["kuvvet", "enerji"]),
            ]),
            topic("Işık ve Ses", f"F.{g}.3.2", [
                ("Işığın yansıması/kırılması veya ses özelliklerini yorumlar.", ["ışık", "ses"]),
            ]),
        ]),
        unit(f"F.{g}.4", "Dünya ve Evren", [
            topic("Dünya ve Uzay", f"F.{g}.4.1", [
                ("Dünya'nın yapısı ve uzay gözlemlerini açıklar.", ["dünya", "uzay"]),
            ]),
        ]),
    ]


def middle_social(g):
    return [
        unit(f"SB.{g}.1", "Birey ve Toplum", [
            topic("Toplumsal Yapı", f"SB.{g}.1.1", [
                ("Toplumsal kurumları ve rollerini açıklar.", ["toplum", "kurum"]),
            ]),
        ]),
        unit(f"SB.{g}.2", "Yaşadığımız Yer", [
            topic("Coğrafi Özellikler", f"SB.{g}.2.1", [
                ("Türkiye'nin coğrafi konumu ve bölgesel özelliklerini açıklar.", ["coğrafya", "Türkiye"]),
            ]),
        ]),
        unit(f"SB.{g}.3", "Tarih ve Kültür", [
            topic("Türk Tarihi", f"SB.{g}.3.1", [
                ("Türk tarihinde önemli dönüm noktalarını sıralar.", ["tarih", "Türk tarihi"]),
            ]),
            topic("Kültür ve Miras", f"SB.{g}.3.2", [
                ("Kültürel miras ögelerini tanır ve korur.", ["miras", "kültür"]),
            ]),
        ]),
        unit(f"SB.{g}.4", "Vatandaşlık", [
            topic("Demokrasi ve Haklar", f"SB.{g}.4.1", [
                ("Temel hak ve özgürlükleri açıklar.", ["hak", "demokrasi"]),
            ]),
        ]),
    ]


def middle_math(g):
    topics_map = {
        7: [
            unit("M.7.1", "Sayılar ve İşlemler", [
                topic("Tam Sayılar", "M.7.1.1", [("Tam sayılarla işlem yapar.", ["tam sayı"]), ("Rasyonel sayıları kullanır.", ["rasyonel"])]),
                topic("Oran ve Orantı", "M.7.1.2", [("Oran-orantı problemlerini çözer.", ["oran"])]),
            ]),
            unit("M.7.2", "Cebir", [
                topic("Cebirsel İfadeler", "M.7.2.1", [("Cebirsel ifadelerle işlem yapar.", ["cebir"]), ("Birinci derece denklemleri çözer.", ["denklem"])]),
            ]),
            unit("M.7.3", "Geometri ve Ölçme", [
                topic("Çember ve Daire", "M.7.3.1", [("Çemberde açı ve uzunluk hesaplar.", ["çember"])]),
                topic("Veri Analizi", "M.7.3.2", [("Veri analizi yapar.", ["istatistik"])]),
            ]),
        ],
        8: [
            unit("M.8.1", "Sayılar ve İşlemler", [
                topic("Üslü ve Köklü Sayılar", "M.8.1.1", [("Üslü ve köklü ifadelerle işlem yapar.", ["üs", "kök"])]),
                topic("Olasılık", "M.8.1.2", [("Basit olasılık hesaplar.", ["olasılık"])]),
            ]),
            unit("M.8.2", "Cebir", [
                topic("Denklemler", "M.8.2.1", [("Birinci dereceden denklem sistemlerini çözer.", ["denklem sistemi"])]),
                topic("Eşitsizlikler", "M.8.2.2", [("Birinci dereceden eşitsizlikleri çözer.", ["eşitsizlik"])]),
            ]),
            unit("M.8.3", "Geometri", [
                topic("Üçgenler", "M.8.3.1", [("Üçgende eşlik ve benzerlik kullanır.", ["benzerlik"])]),
                topic("Dönüşüm Geometrisi", "M.8.3.2", [("Öteleme ve yansıma uygular.", ["dönüşüm"])]),
            ]),
        ],
    }
    return topics_map[g]


def middle_turkish(g):
    return [
        unit(f"T.{g}.1", "Dinleme/İzleme", [topic("Metin Anlama", f"T.{g}.1.1", [("Dinlediği metni analiz eder.", ["dinleme"]), ("Ana fikri belirler.", ["ana fikir"])])]),
        unit(f"T.{g}.2", "Okuma", [topic("Okuduğunu Anlama", f"T.{g}.2.1", [("Metin türlerini ayırt eder.", ["metin türü"]), ("Çıkarım yapar.", ["çıkarım"])])]),
        unit(f"T.{g}.3", "Yazma", [topic("Metin Yazma", f"T.{g}.3.1", [("Planlı metin yazar.", ["yazma"]), ("Kaynak kullanır.", ["kaynak"])])]),
        unit(f"T.{g}.4", "Dil Bilgisi", [topic("Dil Bilgisi", f"T.{g}.4.1", [("Cümle ögelerini belirler.", ["cümle"]), ("Yazım kurallarını uygular.", ["yazım"])])]),
    ]


# ─── HIGH SCHOOL subjects ───
HIGH_SUBJECTS = {
    "math": ("Matematik", "MAT"),
    "geometry": ("Geometri", "GEO"),
    "physics": ("Fizik", "PHY"),
    "chemistry": ("Kimya", "CHM"),
    "biology": ("Biyoloji", "BIO"),
    "turkish_lit": ("Türk Dili ve Edebiyatı", "TDE"),
    "history": ("Tarih", "TAR"),
    "geography": ("Coğrafya", "COG"),
}

HIGH_BY_GRADE = {
    9: ["math", "physics", "chemistry", "biology", "turkish_lit", "history", "geography"],
    10: ["math", "geometry", "physics", "chemistry", "biology", "turkish_lit", "history", "geography"],
    11: ["math", "geometry", "physics", "chemistry", "biology", "turkish_lit", "history", "geography"],
    12: ["math", "geometry", "physics", "chemistry", "biology", "turkish_lit", "history", "geography"],
}

HIGH_UNITS = {
    "math": lambda p, g: [unit(f"{p}.{g}.1", "Sayılar ve Fonksiyonlar", [
        topic("Fonksiyonlar", f"{p}.{g}.1.1", [("Fonksiyon kavramını kullanır.", ["fonksiyon"]), ("Polinom fonksiyonları inceler.", ["polinom"])]),
        topic("Denklemler", f"{p}.{g}.1.2", [("Denklem ve eşitsizlikleri çözer.", ["denklem"])]),
    ])],
    "geometry": lambda p, g: [unit(f"{p}.{g}.1", "Geometrik Şekiller", [
        topic("Üçgen ve Çokgen", f"{p}.{g}.1.1", [("Geometrik ispat yapar.", ["ispat"]), ("Alan ve hacim hesaplar.", ["alan", "hacim"])]),
        topic("Analitik Geometri", f"{p}.{g}.1.2", [("Doğru ve çember denklemlerini kullanır.", ["analitik"])]),
    ])],
    "physics": lambda p, g: [unit(f"{p}.{g}.1", "Fizik", [
        topic("Hareket ve Kuvvet", f"{p}.{g}.1.1", [("Hareket denklemlerini uygular.", ["hareket"]), ("Newton yasalarını yorumlar.", ["kuvvet"])]),
        topic("Enerji", f"{p}.{g}.1.2", [("Enerji dönüşümlerini hesaplar.", ["enerji", "iş"])]),
    ])],
    "chemistry": lambda p, g: [unit(f"{p}.{g}.1", "Kimya", [
        topic("Madde ve Periyodik Sistem", f"{p}.{g}.1.1", [("Periyodik özellikleri açıklar.", ["periyodik tablo"]), ("Kimyasal bağları yorumlar.", ["bağ"])]),
        topic("Tepkimeler", f"{p}.{g}.1.2", [("Kimyasal tepkime denklemlerini dengeler.", ["tepkime"])]),
    ])],
    "biology": lambda p, g: [unit(f"{p}.{g}.1", "Biyoloji", [
        topic("Hücre ve Metabolizma", f"{p}.{g}.1.1", [("Hücre organellerini açıklar.", ["hücre"]), ("Metabolizma süreçlerini yorumlar.", ["metabolizma"])]),
        topic("Kalıtım ve Ekosistem", f"{p}.{g}.1.2", [("Kalıtım ilkelerini uygular.", ["kalıtım"]), ("Ekosistem dengesini açıklar.", ["ekosistem"])]),
    ])],
    "turkish_lit": lambda p, g: [unit(f"{p}.{g}.1", "Edebiyat", [
        topic("Metin İnceleme", f"{p}.{g}.1.1", [("Edebi türleri ayırt eder.", ["tür"]), ("Söz sanatlarını analiz eder.", ["söz sanatı"])]),
        topic("Yazma", f"{p}.{g}.1.2", [("Deneme ve sözlü anlatım yapar.", ["deneme"])]),
    ])],
    "history": lambda p, g: [unit(f"{p}.{g}.1", "Tarih", [
        topic("Türk ve Dünya Tarihi", f"{p}.{g}.1.1", [("Tarihsel dönemleri kronolojik sıralar.", ["kronoloji"]), ("Neden-sonuç ilişkisi kurar.", ["analiz"])]),
    ])],
    "geography": lambda p, g: [unit(f"{p}.{g}.1", "Coğrafya", [
        topic("Doğal ve Beşerî Sistemler", f"{p}.{g}.1.1", [("Harita ve GIS verilerini yorumlar.", ["harita"]), ("İklim ve yer şekillerini açıklar.", ["iklim"])]),
    ])],
}


def main():
    stats = []
    p = ROOT / "primary"
    m = ROOT / "middle"
    h = ROOT / "high"

    for g, units in LIFE.items():
        n = write(p / f"grade_{g}_life_studies.json", base(g, "Hayat Bilgisi", "MEB Hayat Bilgisi (İlkokul)", units))
        stats.append((f"primary/grade_{g}_life_studies.json", n))

    for g, units in SCIENCE_PRIMARY.items():
        n = write(p / f"grade_{g}_science.json", base(g, "Fen Bilimleri", "MEB Fen Bilimleri (İlkokul)", units))
        stats.append((f"primary/grade_{g}_science.json", n))

    for g, units in SOCIAL_PRIMARY.items():
        n = write(p / f"grade_{g}_social_studies.json", base(g, "Sosyal Bilgiler", "MEB Sosyal Bilgiler (İlkokul)", units))
        stats.append((f"primary/grade_{g}_social_studies.json", n))

    for g in range(5, 9):
        for subj, fname, units_fn in [
            ("Fen Bilimleri", "science", middle_science),
            ("Sosyal Bilgiler", "social_studies", middle_social),
        ]:
            n = write(m / f"grade_{g}_{fname}.json", base(g, subj, f"MEB {subj} (Ortaokul {g}. Sınıf)", units_fn(g)))
            stats.append((f"middle/grade_{g}_{fname}.json", n))

    for g in (7, 8):
        n = write(m / f"grade_{g}_math.json", base(g, "Matematik", f"MEB Matematik (Ortaokul {g}. Sınıf)", middle_math(g)))
        stats.append((f"middle/grade_{g}_math.json", n))
        n = write(m / f"grade_{g}_turkish.json", base(g, "Türkçe", f"MEB Türkçe (Ortaokul {g}. Sınıf)", middle_turkish(g)))
        stats.append((f"middle/grade_{g}_turkish.json", n))

    for g, subjects in HIGH_BY_GRADE.items():
        for key in subjects:
            if key == "geometry" and g == 9:
                continue
            name, prefix = HIGH_SUBJECTS[key]
            units = HIGH_UNITS[key](prefix, g)
            n = write(h / f"grade_{g}_{key}.json", base(g, name, f"MEB {name} (Lise {g}. Sınıf)", units))
            stats.append((f"high/grade_{g}_{key}.json", n))

    print(f"Created/updated {len(stats)} files, {sum(s[1] for s in stats)} outcomes")
    for path, n in stats:
        print(f"  {path}: {n} outcomes")


if __name__ == "__main__":
    main()
