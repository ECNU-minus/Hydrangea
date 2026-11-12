import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ClassesService, type QueryClassesParams, type QueryClassesResult, type ClassItem } from "./classes.service.js";

@Controller('classes')
export class ClassesController{
    constructor(private readonly classesService: ClassesService) {}

    @Get()
    query(@Query() params: QueryClassesParams): QueryClassesResult {
        return this.classesService.query(params);
    }

    /**
     * 获取单个教学班（DESIGN §3.5）
     *
     * 意向列表需要按教学班代码回查课程名称等信息（PRD §3.2.8）。
     * 缺 `semester` → 400；该学期无此教学班 → 404。
     */
    @Get(':classCode')
    findOne(
        @Param('classCode') classCode: string,
        @Query('semester') semester?: string,
    ): ClassItem {
        if (!semester) {
            throw new BadRequestException('缺少必填参数 semester');
        }

        const item = this.classesService.findOne(semester, classCode);
        if (!item) {
            throw new NotFoundException(`教学班不存在：${semester} / ${classCode}`);
        }

        return item;
    }
}
