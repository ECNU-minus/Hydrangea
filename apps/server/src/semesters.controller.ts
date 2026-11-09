import { Controller, Get } from '@nestjs/common';
import { SemestersService, type SemestersResponse } from './semesters.service.js';

/** 学期接口（DESIGN §3.1） */
@Controller('semesters')
export class SemestersController {
    constructor(private readonly semestersService: SemestersService) {}

    /** 可用学期列表（最新在前）+ 当前学期 */
    @Get()
    query(): SemestersResponse {
        return this.semestersService.list();
    }
}
