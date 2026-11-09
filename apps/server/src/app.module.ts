import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { FiltersController } from './filters.controller.js';
import { FiltersService } from './filters.service.js';
import { SemestersController } from './semesters.controller.js';
import { SemestersService } from './semesters.service.js';

@Module({
  imports: [],
  controllers: [AppController, ClassesController, FiltersController, SemestersController],
  providers: [AppService, ClassesService, FiltersService, SemestersService],
})
export class AppModule {}
