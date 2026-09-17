-- =============================================================================
-- Seed: örnek curriculum + mikro testler (MVP demo içerik)
-- Idempotent — ON CONFLICT DO NOTHING
-- =============================================================================

insert into public.curriculum (
  id, grade, subject, topic, description,
  cached_audio_url, cached_canvas_json, estimated_minutes
) values
(
  '11111111-1111-1111-1111-111111111101',
  5, 'Matematik', 'Kesirler',
  'Kesir kavramı ve payda eşitleme — önbellek anlatım',
  null,
  '[
    {"type":"text","x":40,"y":60,"content":"Kesir = pay / payda","latex":true},
    {"type":"formula","x":40,"y":120,"latex":"\\frac{1}{2} + \\frac{1}{4} = ?"},
    {"type":"line","x1":40,"y1":180,"x2":320,"y2":180}
  ]'::jsonb,
  12
),
(
  '11111111-1111-1111-1111-111111111102',
  8, 'Matematik', 'Üslü ifadeler',
  'LGS odaklı üslü sayılar — önbellek anlatım',
  null,
  '[
    {"type":"formula","x":40,"y":80,"latex":"2^3 \\cdot 2^2 = 2^5"},
    {"type":"text","x":40,"y":140,"content":"Taban aynı → üsler toplanır"}
  ]'::jsonb,
  15
),
(
  '11111111-1111-1111-1111-111111111103',
  12, 'Matematik', 'Türev',
  'YKS Türev giriş — önbellek anlatım',
  null,
  '[
    {"type":"formula","x":40,"y":80,"latex":"f''(x) = \\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}"},
    {"type":"text","x":40,"y":150,"content":"Anlık değişim hızı"}
  ]'::jsonb,
  18
),
(
  '11111111-1111-1111-1111-111111111104',
  3, 'Türkçe', 'Noktalama',
  'İlkokul noktalama işaretleri',
  null,
  '[
    {"type":"text","x":40,"y":80,"content":"Cümle sonu: . ? !"},
    {"type":"highlight","x":36,"y":72,"w":200,"h":32}
  ]'::jsonb,
  10
)
on conflict (grade, subject, topic) do nothing;

insert into public.micro_quizzes (id, curriculum_id, questions) values
(
  '22222222-2222-2222-2222-222222222201',
  '11111111-1111-1111-1111-111111111101',
  '[
    {
      "prompt": "1/2 + 1/4 = ?",
      "choices": ["1/6", "3/4", "2/6", "1/8"],
      "correct_index": 1,
      "hint_latex": "\\frac{1}{2}+\\frac{1}{4}=\\frac{3}{4}"
    },
    {
      "prompt": "Paydası 8 olan eşdeğer kesir: 1/2 = ?",
      "choices": ["2/8", "4/8", "3/8", "5/8"],
      "correct_index": 1,
      "hint_latex": "\\frac{1}{2}=\\frac{4}{8}"
    }
  ]'::jsonb
),
(
  '22222222-2222-2222-2222-222222222202',
  '11111111-1111-1111-1111-111111111102',
  '[
    {
      "prompt": "2^3 · 2^2 = ?",
      "choices": ["2^5", "2^6", "4^5", "2^1"],
      "correct_index": 0,
      "hint_latex": "2^{3+2}=2^5"
    }
  ]'::jsonb
)
on conflict (id) do nothing;
