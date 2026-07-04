import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseService } from './database.service';

@ApiTags('Database')
@ApiBearerAuth()
@Controller('db')
export class DatabaseController {
  constructor(private svc: DatabaseService) {}

  @Get('tables')
  @ApiOperation({ summary: 'List all database tables' })
  listTables() {
    return this.svc.listTables();
  }

  @Get(':table/schema')
  @ApiOperation({ summary: 'Get table schema with column info and row count' })
  getTableSchema(@Param('table') table: string) {
    return this.svc.getTableSchema(table);
  }

  @Get(':table/rows')
  @ApiOperation({ summary: 'List rows in a table with pagination' })
  getRows(
    @Param('table') table: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.getRows(table, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0);
  }

  @Get(':table/rows/:id')
  @ApiOperation({ summary: 'Get a single row by primary key' })
  getRow(
    @Param('table') table: string,
    @Param('id') id: string,
    @Query('pk') pkColumn?: string,
  ) {
    return this.svc.getRow(table, id, pkColumn || 'id');
  }

  @Post(':table/rows')
  @ApiOperation({ summary: 'Insert a new row' })
  createRow(@Param('table') table: string, @Body() body: Record<string, any>) {
    return this.svc.createRow(table, body);
  }

  @Put(':table/rows/:id')
  @ApiOperation({ summary: 'Update a row by primary key' })
  updateRow(
    @Param('table') table: string,
    @Param('id') id: string,
    @Query('pk') pkColumn: string | undefined,
    @Body() body: Record<string, any>,
  ) {
    return this.svc.updateRow(table, id, pkColumn || 'id', body);
  }

  @Delete(':table/rows/:id')
  @ApiOperation({ summary: 'Delete a row by primary key' })
  deleteRow(
    @Param('table') table: string,
    @Param('id') id: string,
    @Query('pk') pkColumn: string | undefined,
  ) {
    return this.svc.deleteRow(table, id, pkColumn || 'id');
  }

  @Post('query')
  @ApiOperation({ summary: 'Execute a raw SQL query (SELECT returns rows, other returns affected count)' })
  executeQuery(@Body() body: { sql: string }) {
    return this.svc.executeQuery(body.sql);
  }
}
