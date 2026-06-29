/**
 * 공공기관(식품안전나라 COOKRCP01) 레시피 시드 적재 스크립트
 *
 * 문서: docs/recipe-from-gov.md
 * 실행:
 *   pnpm seed              # DATABASE_URL 의 DB 에 적재
 *   pnpm seed -- --dry     # DB 에 쓰지 않고 매핑 결과만 출력 (검증용)
 *
 * 환경변수:
 *   SEED_RECIPE_COUNT  적재할 레시피 수 (기본 100)
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaClient } from '../generated/prisma/client';
import { IngredientUnit, RecipeDifficulty } from '../generated/prisma/enums';

loadEnv({ path: resolve(__dirname, '../.dev.env') });

const API_KEY = '5aeb07f376d24e059179';
const SERVICE_ID = 'COOKRCP01';
const BASE_URL = 'http://openapi.foodsafetykorea.go.kr/api';
const PAGE_SIZE = 100;

const DRY_RUN = process.argv.includes('--dry');
const TOTAL = Number(process.env.SEED_RECIPE_COUNT ?? 100);

// 양념·고명류는 optional 재료로 표시
const OPTIONAL_KEYWORDS = ['양념', '소스', '고명', '드레싱', '육수', '국물', '토핑', '곁들임'];

interface CookRow {
  RCP_NM: string;
  RCP_PAT2?: string;
  RCP_WAY2?: string;
  RCP_NA_TIP?: string;
  HASH_TAG?: string;
  RCP_PARTS_DTLS?: string;
  ATT_FILE_NO_MAIN?: string;
  ATT_FILE_NO_MK?: string;
  [key: string]: string | undefined;
}

interface ParsedIngredient {
  name: string;
  quantity: number | null;
  unit: IngredientUnit | null;
  optional: boolean;
}

function mapUnit(raw: string): IngredientUnit | null {
  switch (raw.toLowerCase()) {
    case 'kg':
      return IngredientUnit.KG;
    case 'g':
      return IngredientUnit.G;
    case 'ml':
      return IngredientUnit.ML;
    case 'l':
      return IngredientUnit.L;
    default:
      return null;
  }
}

/** "연두부 75g(3/4모)" → { name: '연두부', quantity: 75, unit: G } */
function parseItem(raw: string): Omit<ParsedIngredient, 'optional'> | null {
  const cleaned = raw
    .replace(/\([^)]*\)/g, '') // 괄호 안 부연설명 제거
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  const digitIdx = cleaned.search(/\d/);
  if (digitIdx <= 0) {
    // "참깨 약간" 처럼 수량 없는 재료
    return cleaned.length <= 40 ? { name: cleaned, quantity: null, unit: null } : null;
  }

  const name = cleaned.slice(0, digitIdx).trim();
  if (!name || name.length > 40) return null;

  const m = cleaned.slice(digitIdx).match(/^([\d.]+)\s*(kg|g|ml|l)?/i);
  return {
    name,
    quantity: m ? Number(m[1]) : null,
    unit: m && m[2] ? mapUnit(m[2]) : null,
  };
}

function parseIngredients(raw?: string): ParsedIngredient[] {
  const result: ParsedIngredient[] = [];
  if (!raw) return result;

  let optional = false;
  for (let line of raw.split('\n')) {
    line = line.replace(/^[·*\-·]\s*/, '').replace(/\[[^\]]*\]/g, '').trim();
    if (!line) continue;

    // "양념장 : ..." 처럼 라벨이 붙은 경우 → 그룹 optional 처리 후 나머지 파싱
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1 && colonIdx <= 12) {
      const label = line.slice(0, colonIdx);
      optional = OPTIONAL_KEYWORDS.some((k) => label.includes(k));
      line = line.slice(colonIdx + 1).trim();
    }

    // 콤마도 숫자도 없는 줄 = 그룹 헤더 (예: "고명") → 다음 재료의 optional 여부만 갱신
    if (!line.includes(',') && !/\d/.test(line)) {
      optional = OPTIONAL_KEYWORDS.some((k) => line.includes(k));
      continue;
    }

    for (const token of line.split(',')) {
      const parsed = parseItem(token);
      if (parsed) result.push({ ...parsed, optional });
    }
  }
  return result;
}

function parseSteps(row: CookRow): string[] {
  const steps: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = `MANUAL${String(i).padStart(2, '0')}`;
    const text = (row[key] ?? '').trim();
    if (!text) continue;
    const cleaned = text
      .replace(/^\d+\.\s*/, '') // 선두 "1. " 번호 제거
      .replace(/([.!?])[A-Za-z]$/, '$1') // 끝에 붙은 이미지 식별 문자(a/b/c) 제거
      .trim();
    if (cleaned) steps.push(cleaned);
  }
  return steps;
}

function inferDifficulty(stepCount: number): RecipeDifficulty {
  if (stepCount <= 4) return RecipeDifficulty.EASY;
  if (stepCount <= 8) return RecipeDifficulty.MEDIUM;
  return RecipeDifficulty.HARD;
}

function toRecipe(row: CookRow) {
  const steps = parseSteps(row);
  return {
    title: row.RCP_NM.trim(),
    description: row.RCP_NA_TIP?.trim() || row.HASH_TAG?.trim() || null,
    imageUrl: row.ATT_FILE_NO_MK?.trim() || row.ATT_FILE_NO_MAIN?.trim() || null,
    difficulty: inferDifficulty(steps.length),
    steps,
    ingredients: parseIngredients(row.RCP_PARTS_DTLS),
  };
}

async function fetchRows(start: number, end: number): Promise<CookRow[]> {
  const url = `${BASE_URL}/${API_KEY}/${SERVICE_ID}/json/${start}/${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const code = data?.[SERVICE_ID]?.RESULT?.CODE;
  if (code && code !== 'INFO-000') {
    throw new Error(`API 오류: ${code} ${data?.[SERVICE_ID]?.RESULT?.MSG}`);
  }
  return data?.[SERVICE_ID]?.row ?? [];
}

async function main() {
  console.log(`레시피 시드 시작 — 목표 ${TOTAL}건${DRY_RUN ? ' (dry-run)' : ''}`);

  const rows: CookRow[] = [];
  for (let start = 1; start <= TOTAL; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE - 1, TOTAL);
    const page = await fetchRows(start, end);
    rows.push(...page);
    if (page.length === 0) break; // 데이터 끝
  }

  const recipes = rows
    .filter((r) => r.RCP_NM?.trim())
    .map(toRecipe)
    .filter((r) => r.steps.length > 0);

  console.log(`API 수신 ${rows.length}건 → 적재 대상 ${recipes.length}건`);

  if (DRY_RUN) {
    console.dir(recipes.slice(0, 3), { depth: null });
    console.log('\n(dry-run: DB 에 쓰지 않음)');
    return;
  }

  const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // 시스템 레시피(authorId 없음)만 초기화 → 멱등성 보장
    const { count } = await prisma.recipe.deleteMany({ where: { authorId: null } });
    if (count) console.log(`기존 시스템 레시피 ${count}건 삭제`);

    let created = 0;
    for (const recipe of recipes) {
      await prisma.recipe.create({
        data: {
          title: recipe.title,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          difficulty: recipe.difficulty,
          steps: recipe.steps,
          ingredients: {
            create: recipe.ingredients.map(({ name, quantity, unit, optional }) => ({
              quantity,
              unit,
              optional,
              // 표준 재료 카탈로그에 연결, 없으면 생성 → '양파'는 1행만 존재
              item: {
                connectOrCreate: {
                  where: { name },
                  create: { name },
                },
              },
            })),
          },
        },
      });
      created++;
    }
    console.log(`레시피 ${created}건 적재 완료 ✅`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('시드 실패:', err);
  process.exit(1);
});
