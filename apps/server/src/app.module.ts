import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { FiltersController } from './filters.controller.js';
import { FiltersService } from './filters.service.js';

@Module({
  imports: [],
  controllers: [AppController, ClassesController, FiltersController],
  providers: [AppService, ClassesService, FiltersService],
})
export class AppModule {}
