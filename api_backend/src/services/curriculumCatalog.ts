import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export type CurriculumCatalogItem = {
  id: string;
  grade: number | string;
  subject: string;
  topic: string;
  description: string | null;
  estimated_minutes: number;
  unit_name: string | null;
  outcome_codes: string[];
  keywords: string[];
  program_ref: string | null;
  source: 'json';
};

type Outcome = { code: string; description: string; keywords?: string[] };
type Topic = { topic_name: string; outcomes: Outcome[] };
type Unit = { unit_code?: string; unit_name: string; topics: Topic[] };
type CurriculumFile = {
  grade: number | string;
  subject: string;
  program_ref?: string;
  units: Unit[];
};

let cache: CurriculumCatalogItem[] | null = null;

function stableUuid(input: string): string {
  const h = createHash('sha256').update(input).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function resolveCurriculumRoot(): string {
  if (process.env.CURRICULUM_ROOT) return process.env.CURRICULUM_ROOT;
  // Prefer cwd (api_backend when running npm run dev) then parent repo root
  const candidates = [
    path.resolve(process.cwd(), '../assets/data/curriculum'),
    path.resolve(process.cwd(), 'assets/data/curriculum'),
    path.resolve(process.cwd(), '../../assets/data/curriculum'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function walkJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      out.push(full);
    }
  }
  return out;
}

function flattenFile(data: CurriculumFile): CurriculumCatalogItem[] {
  const items: CurriculumCatalogItem[] = [];
  for (const unit of data.units ?? []) {
    for (const topic of unit.topics ?? []) {
      const outcomes = topic.outcomes ?? [];
      const keywords = [
        ...new Set(outcomes.flatMap((o) => o.keywords ?? [])),
      ];
      const description =
        outcomes.map((o) => o.description).filter(Boolean).join(' · ') || null;
      const key = `${data.grade}|${data.subject}|${topic.topic_name}`;
      items.push({
        id: stableUuid(key),
        grade: data.grade,
        subject: data.subject,
        topic: topic.topic_name,
        description,
        estimated_minutes: 10,
        unit_name: unit.unit_name ?? null,
        outcome_codes: outcomes.map((o) => o.code).filter(Boolean),
        keywords,
        program_ref: data.program_ref ?? null,
        source: 'json',
      });
    }
  }
  return items;
}

export function loadCurriculumCatalog(forceReload = false): CurriculumCatalogItem[] {
  if (cache && !forceReload) return cache;
  const root = resolveCurriculumRoot();
  const files = walkJsonFiles(root);
  const items: CurriculumCatalogItem[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as CurriculumFile;
      if (raw?.grade == null || !raw.subject || !Array.isArray(raw.units)) continue;
      items.push(...flattenFile(raw));
    } catch (err) {
      console.warn('[curriculumCatalog] skip', file, err);
    }
  }
  cache = items;
  console.log(
    `[curriculumCatalog] loaded ${items.length} topics from ${files.length} files (${root})`,
  );
  return items;
}

export function listCurriculumTopics(input: {
  grade?: number;
  exam?: string;
  subject?: string;
  topic?: string;
  id?: string;
  limit?: number;
}): CurriculumCatalogItem[] {
  const all = loadCurriculumCatalog();
  let rows = all;

  if (input.id) {
    rows = rows.filter((r) => r.id === input.id);
  } else if (input.exam) {
    const exam = input.exam.toUpperCase();
    rows = rows.filter(
      (r) => typeof r.grade === 'string' && r.grade.toUpperCase() === exam,
    );
  } else if (input.grade != null) {
    rows = rows.filter((r) => r.grade === input.grade);
  }

  if (input.subject) {
    const s = input.subject.toLocaleLowerCase('tr');
    rows = rows.filter((r) => r.subject.toLocaleLowerCase('tr') === s);
  }
  if (input.topic) {
    const t = input.topic.toLocaleLowerCase('tr');
    rows = rows.filter((r) => r.topic.toLocaleLowerCase('tr').includes(t));
  }

  const limit = input.limit ?? 200;
  return rows.slice(0, limit);
}

export function listCurriculumSubjects(gradeOrExam: number | string): string[] {
  const all = loadCurriculumCatalog();
  const rows =
    typeof gradeOrExam === 'number'
      ? all.filter((r) => r.grade === gradeOrExam)
      : all.filter(
          (r) =>
            typeof r.grade === 'string' &&
            r.grade.toUpperCase() === String(gradeOrExam).toUpperCase(),
        );
  return [...new Set(rows.map((r) => r.subject))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
}
