import { Controller, Get, Query} from '@nestjs/common';
import { ClassesService, type QueryClassesParams, type QueryClassesResult }from "./classes.service.js";

@Controller('classes')
export class ClassesController{
    constructor(private readonly classesService: ClassesService) {}
    @Get()
    query(@Query() params: QueryClassesParams): QueryClassesResult {
        const result = this.classesService.query(params);
        return result;
    }
}