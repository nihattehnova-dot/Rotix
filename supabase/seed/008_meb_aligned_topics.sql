-- 008 — MEB uyumlu konu başlıkları (kendi senaryolarımız; telifli PDF kopyası değil)
-- Önce 007 çalışmış olmalı (script_text sütunu)

insert into public.curriculum (
  id, grade, subject, topic, description, script_text, cached_canvas_json, estimated_minutes
) values
('11111111-1111-1111-1111-111111111301', 3, 'Matematik', 'Çarpma işlemi', '3. sınıf çarpma',
 'Merhaba! Çarpmayı tekrar edelim. Üç kere dört, üç tane dördün toplamıdır: dört artı dört artı dört eşittir on iki. Tabloyu yavaşça söyle, sonra hızlan. Takılırsan durdur, birlikte bakarız.',
 '[{"type":"text","x":40,"y":80,"content":"3 x 4 = 4+4+4 = 12"}]'::jsonb, 10),
('11111111-1111-1111-1111-111111111302', 4, 'Türkçe', 'Sıfatlar', 'Niteleme sıfatı',
 'Sıfat, ismi niteleyen sözcüktür. Güzel çiçek, büyük ev. Hangisi sıfat, hangisi isim? Birlikte bulalım. Cümlede “nasıl?” sorusuna cevap veren çoğu zaman sıfattır.',
 '[{"type":"text","x":40,"y":80,"content":"güzel çiçek → güzel = sıfat"}]'::jsonb, 10),
('11111111-1111-1111-1111-111111111303', 5, 'Matematik', 'Ondalık gösterim', 'Ondalık sayılar',
 'Ondalık gösterimde virgülden sonraki basamaklar onda bir, yüzde birdir. Örneğin 0,5 yarım demektir. 0,25 ise dörtte birdir. Tahtada virgülü net görelim.',
 '[{"type":"text","x":40,"y":70,"content":"0,5 = 1/2"},{"type":"text","x":40,"y":140,"content":"0,25 = 1/4"}]'::jsonb, 12),
('11111111-1111-1111-1111-111111111304', 5, 'Fen', 'Maddenin halleri', 'Katı sıvı gaz',
 'Maddenin üç hali vardır: katı, sıvı, gaz. Buz katı, su sıvı, buhar gazdır. Isı verirsek katı sıvıya, sıvı gaza dönebilir. Örnekleri birlikte sayalım.',
 '[{"type":"text","x":40,"y":70,"content":"Katı → Sıvı → Gaz"},{"type":"text","x":40,"y":140,"content":"Buz → Su → Buhar"}]'::jsonb, 12),
('11111111-1111-1111-1111-111111111305', 6, 'Türkçe', 'Fiilimsiler', 'İsim-fiil giriş',
 'Fiilimsiler fiilden türeyip cümlede isim, sıfat veya zarf gibi davranır. “Okumak güzeldir” cümlesinde okumak isim-fiildir. Kısa örneklerle pekiştirelim.',
 '[{"type":"text","x":40,"y":80,"content":"okumak = isim-fiil"}]'::jsonb, 12),
('11111111-1111-1111-1111-111111111306', 7, 'Matematik', 'Cebirsel ifadeler', 'Değişken',
 'Cebirde harfler bilinmeyen sayıları temsil eder. İki x artı üç ifadesinde x değişkendir. Aynı tür terimleri toplayabiliriz. Örnek: iki x artı beş x eşittir yedi x.',
 '[{"type":"formula","x":40,"y":80,"latex":"2x+5x=7x"}]'::jsonb, 14),
('11111111-1111-1111-1111-111111111307', 8, 'Matematik', 'Olasılık', 'Basit olasılık',
 'Olasılık, bir olayın olma şansıdır. Yazı-tura da iki sonuç vardır; yazı gelme olasılığı bir bölü ikidir. Formül: uygun durum bölü tüm durumlar.',
 '[{"type":"formula","x":40,"y":80,"latex":"P=\\frac{uygun}{tum}"}]'::jsonb, 14)
on conflict (id) do update set
  script_text = excluded.script_text,
  cached_canvas_json = excluded.cached_canvas_json,
  is_active = true;
