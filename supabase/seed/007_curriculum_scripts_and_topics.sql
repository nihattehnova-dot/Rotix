-- 007 — Anlatım metni (TTS) + ilkokul/ortaokul müfredat genişletme
-- SQL Editor'de bir kez Run et

alter table public.curriculum
  add column if not exists script_text text;

-- Mevcut demo konularına seslendirilecek metin
update public.curriculum set script_text = 'Merhaba! Bugün kesirleri konuşuyoruz. Kesir, bir bütünün parçalarını gösterir. Pay üstte, payda altta. Örneğin bir bölü iki, yarım demektir. Bir bölü iki artı bir bölü dört için paydaları eşitleyelim: iki ile dördün ortak paydası dört. Bir bölü iki, iki bölü dört olur. İki bölü dört artı bir bölü dört eşittir üç bölü dört. Harikasın!'
where id = '11111111-1111-1111-1111-111111111101';

update public.curriculum set script_text = 'Üslü ifadelerde taban aynıysa üsler toplanır. İkinin küpü çarpı ikinin karesi eşittir ikinin beşinci kuvveti. Unutma: taban aynı olmalı. Farklı tabanlarda bu kuralı kullanamayız.'
where id = '11111111-1111-1111-1111-111111111102';

update public.curriculum set script_text = 'Noktalama, cümleyi doğru okumamıza yardım eder. Cümle sonunda nokta, soru işareti veya ünlem kullanırız. Virgül ise kısa duraklama içindir. Okurken bu işaretlere dikkat edelim.'
where id = '11111111-1111-1111-1111-111111111104';

-- Daha fazla sınıf / konu (idempotent)
insert into public.curriculum (
  id, grade, subject, topic, description, script_text, cached_audio_url, cached_canvas_json, estimated_minutes
) values
(
  '11111111-1111-1111-1111-111111111201',
  1, 'Matematik', 'Sayılar 1-20',
  'Sayıları tanıyalım',
  'Merhaba! Bugün birden yirmiye kadar sayıları tekrar ediyoruz. Bir, iki, üç… On, on bir, on iki. Yirmiye kadar sayabilir misin? Ellerini çırparak birlikte sayalım.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"1  2  3  4  5"},{"type":"text","x":40,"y":120,"content":"6  7  8  9  10"},{"type":"text","x":40,"y":180,"content":"11 … 20"}]'::jsonb,
  8
),
(
  '11111111-1111-1111-1111-111111111202',
  2, 'Matematik', 'Toplama',
  'İki basamaklı toplama',
  'Toplamada sayıları birleştiririz. On iki artı beş eşittir on yedi. Önce birler basamağını, sonra onlar basamağını topla. Sonuç doğru mu diye bir daha kontrol et.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"12 + 5 = ?"},{"type":"text","x":40,"y":130,"content":"12 + 5 = 17"}]'::jsonb,
  10
),
(
  '11111111-1111-1111-1111-111111111203',
  4, 'Matematik', 'Çarpım tablosu',
  '6 ve 7 ile çarpma',
  'Çarpım tablosu ezber değil, düzenli tekrardır. Altı kere üç on sekiz, yedi kere dört yirmi sekiz. Bugün altı ve yediyi pekiştirelim. Yavaşça söyle, sonra hızlan.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"6 x 3 = 18"},{"type":"text","x":40,"y":120,"content":"7 x 4 = 28"}]'::jsonb,
  12
),
(
  '11111111-1111-1111-1111-111111111204',
  5, 'Türkçe', 'Paragraf',
  'Ana fikir bulma',
  'Bir paragrafta ana fikir, yazarın asıl söylemek istediğidir. Yardımcı cümleler bunu destekler. Önce başlığı ve ilk cümleyi oku, sonra “ne anlatılıyor?” diye sor.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"Ana fikir = asıl mesaj"},{"type":"text","x":40,"y":120,"content":"Yardimci cumleler destekler"}]'::jsonb,
  12
),
(
  '11111111-1111-1111-1111-111111111205',
  5, 'Fen', 'Canlılar ve yaşam',
  'Besin zinciri',
  'Besin zincirinde üreticiler bitkilerdir. Otçullar bitkileri yer, etçiller otçulları yer. Zincir bozulursa ekosistem etkilenir. Örnek: çimen, tavşan, tilki.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"Bitki → Otçul → Etçil"},{"type":"text","x":40,"y":130,"content":"Çimen → Tavşan → Tilki"}]'::jsonb,
  12
),
(
  '11111111-1111-1111-1111-111111111206',
  6, 'Matematik', 'Oran orantı',
  'Basit oran',
  'Oran, iki sayının birbirine bölümüdür. İki bölü üç oranı, her üç parçadan ikisini alırız demektir. Orantıda çapraz çarpım yaparız: a bölü b eşittir c bölü d ise a çarpı d eşittir b çarpı c.',
  null,
  '[{"type":"formula","x":40,"y":80,"latex":"\\frac{a}{b}=\\frac{c}{d}"},{"type":"text","x":40,"y":150,"content":"a·d = b·c"}]'::jsonb,
  14
),
(
  '11111111-1111-1111-1111-111111111207',
  7, 'Matematik', 'Tam sayılar',
  'Negatif sayılar',
  'Tam sayılar sıfırın solunda negatif, sağında pozitiftir. Eksi üç, sıfırdan üç birim soldadır. Termometrede eksi beş, eksi ikiden daha soğuktur çünkü daha küçüktür.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"… -3 -2 -1 0 1 2 3 …"},{"type":"text","x":40,"y":130,"content":"-5 < -2"}]'::jsonb,
  14
),
(
  '11111111-1111-1111-1111-111111111208',
  8, 'Fen', 'Kuvvet ve hareket',
  'Newton''un 1. yasası',
  'Bir cisim üzerine net kuvvet sıfırsa, duruyorsa durmaya, hareketliyorsa sabit hızla gitmeye devam eder. Buna eylemsizlik deriz. Emniyet kemeri bu yüzden önemli.',
  null,
  '[{"type":"text","x":40,"y":60,"content":"Net kuvvet = 0 → hız sabit"},{"type":"text","x":40,"y":130,"content":"Eylemsizlik ilkesi"}]'::jsonb,
  15
)
on conflict (id) do update set
  script_text = excluded.script_text,
  description = excluded.description,
  cached_canvas_json = excluded.cached_canvas_json,
  is_active = true;
