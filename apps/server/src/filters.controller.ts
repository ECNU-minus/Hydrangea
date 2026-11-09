import { Controller, Get, Query } from '@nestjs/common';
import { FiltersService, type FilterOptions } from './filters.service.js';

/** 筛选项接口（DESIGN §3.3） */
@Controller('filters')
export class FiltersController {
    constructor(private readonly filtersService: FiltersService) {}

    /** 获取筛选项：`semester` 必填，选项按该学期数据自动生成 */
    @Get()
    query(@Query('semester') semester: string): FilterOptions {
        return this.filtersService.queryFiltersBySemester(semester);
    }
}
