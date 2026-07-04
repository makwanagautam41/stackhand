import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function stripBigInts<T>(value: T): T {
  if (typeof value === 'bigint') return Number(value) as T;
  if (Array.isArray(value)) return value.map(stripBigInts) as T;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) result[k] = stripBigInts(obj[k]);
    return result as T;
  }
  return value;
}

@Injectable()
export class DatabaseService {
  constructor(private prisma: PrismaService) {}

  async listTables(): Promise<string[]> {
    const result: { name: string }[] = await this.prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name`,
    );
    return result.map(r => r.name);
  }

  async getTableSchema(table: string) {
    this.ensureTableName(table);
    const columns: { cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number }[] =
      await this.prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
    const countResult: { count: number }[] = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
    return stripBigInts({
      table,
      columns: columns.map(c => ({
        cid: c.cid,
        name: c.name,
        type: c.type,
        notNull: !!c.notnull,
        default: c.dflt_value,
        primaryKey: !!c.pk,
      })),
      rowCount: countResult[0]?.count ?? 0,
    });
  }

  async getRows(table: string, limit = 50, offset = 0) {
    this.ensureTableName(table);
    const rows: Record<string, any>[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    );
    return stripBigInts(rows);
  }

  async getRow(table: string, id: string, pkColumn: string) {
    this.ensureTableName(table);
    this.ensureSafeString(pkColumn);
    const rows: Record<string, any>[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" WHERE "${pkColumn}" = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? stripBigInts(rows[0]) : null;
  }

  async createRow(table: string, data: Record<string, any>) {
    this.ensureTableName(table);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    const quoted = columns.map(c => `"${c}"`).join(', ');
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders})`,
        ...values,
      );
      const rowId: { last_insert_rowid: number }[] = await this.prisma.$queryRawUnsafe('SELECT last_insert_rowid() as last_insert_rowid');
      return stripBigInts({ inserted: true, rowId: rowId[0]?.last_insert_rowid });
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async updateRow(table: string, id: string, pkColumn: string, data: Record<string, any>) {
    this.ensureTableName(table);
    this.ensureSafeString(pkColumn);
    const setClauses = Object.keys(data).map(c => `"${c}" = ?`).join(', ');
    const values = Object.values(data);
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET ${setClauses} WHERE "${pkColumn}" = ?`,
        ...values,
        id,
      );
      return { updated: true };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async deleteRow(table: string, id: string, pkColumn: string) {
    this.ensureTableName(table);
    this.ensureSafeString(pkColumn);
    try {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "${pkColumn}" = ?`,
        [id],
      );
      return { deleted: true };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async executeQuery(sql: string) {
    const trimmed = sql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA');
    const isRead = isSelect || trimmed.startsWith('EXPLAIN');
    try {
      if (isRead) {
        const rows = await this.prisma.$queryRawUnsafe(sql);
        return stripBigInts({ type: 'select', rows });
      }
      const result = await this.prisma.$executeRawUnsafe(sql);
      return { type: 'execute', affected: result };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  private ensureTableName(name: string) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new BadRequestException('Invalid table name');
    }
  }

  private ensureSafeString(value: string) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      throw new BadRequestException('Invalid column name');
    }
  }
}
