import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';

@Module({
  imports: [],
  controllers: [AppController, ClassesController],
  providers: [AppService, ClassesService],
})
export class AppModule {}
