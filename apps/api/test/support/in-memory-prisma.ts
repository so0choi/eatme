// e2e 전용 PrismaService 대체물. 실제 DB 없이 리졸버·가드·검증 파이프를 끝까지 태우기 위해
// 서비스 코드가 실제로 호출하는 Prisma 메서드만 최소 구현한다. 새 쿼리를 쓰면 여기도 추가할 것.

type Row = Record<string, any> & { id: number };
type Where = Record<string, any>;

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(row[key]);
      if ('notIn' in cond) return !cond.notIn.includes(row[key]);
      if ('gte' in cond) return row[key] >= cond.gte;
      if ('lt' in cond) return row[key] < cond.lt;
    }
    return row[key] === cond;
  });
}

function applyData(row: Row, data: Record<string, any>) {
  for (const [key, value] of Object.entries(data)) {
    row[key] = value && typeof value === 'object' && 'set' in value ? value.set : value;
  }
  row.updatedAt = new Date();
  return row;
}

class Table {
  rows: Row[] = [];
  private seq = 1;

  constructor(private defaults: () => Record<string, any> = () => ({})) {}

  findUnique = async ({ where }: { where: Where }) => this.rows.find((r) => matches(r, where)) ?? null;
  findFirst = async ({ where }: { where: Where }) => this.rows.find((r) => matches(r, where)) ?? null;
  findMany = async ({ where, orderBy }: { where?: Where; orderBy?: Record<string, 'asc' | 'desc'> } = {}) => {
    const result = this.rows.filter((r) => matches(r, where));
    if (orderBy) {
      const [[key, dir]] = Object.entries(orderBy);
      result.sort((a, b) => (a[key] > b[key] ? 1 : -1) * (dir === 'desc' ? -1 : 1));
    }
    return result;
  };
  create = async ({ data }: { data: Record<string, any> }) => {
    const now = new Date();
    const row = { ...this.defaults(), createdAt: now, updatedAt: now, ...data, id: this.seq++ };
    this.rows.push(row);
    return row;
  };
  update = async ({ where, data }: { where: Where; data: Record<string, any> }) => {
    const row = this.rows.find((r) => matches(r, where));
    if (!row) throw new Error('Record to update not found.');
    return applyData(row, data);
  };
  updateMany = async ({ where, data }: { where: Where; data: Record<string, any> }) => {
    const targets = this.rows.filter((r) => matches(r, where));
    targets.forEach((r) => applyData(r, data));
    return { count: targets.length };
  };
  delete = async ({ where }: { where: Where }) => {
    const index = this.rows.findIndex((r) => matches(r, where));
    if (index < 0) throw new Error('Record to delete does not exist.');
    return this.rows.splice(index, 1)[0];
  };
  deleteMany = async ({ where }: { where?: Where } = {}) => {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(r, where));
    return { count: before - this.rows.length };
  };
}

export class InMemoryPrisma {
  user = new Table(() => ({ provider: 'local', providers: [], phone: null }));
  session = new Table();
  ingredient = new Table(() => ({
    status: 'FRESH',
    price: null,
    quantity: null,
    unit: null,
    expireAt: null,
    category: null,
    imageUrl: null,
  }));
  ingredientDisposal = new Table(() => ({ discardedAt: new Date() }));

  async $connect() {}
  async $disconnect() {}

  async $transaction(arg: Promise<unknown>[] | ((tx: this) => Promise<unknown>)) {
    return Array.isArray(arg) ? Promise.all(arg) : arg(this);
  }

  reset() {
    for (const table of [this.user, this.session, this.ingredient, this.ingredientDisposal]) {
      table.rows = [];
    }
  }
}
