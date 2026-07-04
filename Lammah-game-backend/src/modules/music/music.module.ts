import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';
import {
  AdminMusicTracksController,
  MusicQuestionsController,
} from './music.controller';
import { MusicMetadataAgentService } from './music-metadata-agent.service';
import { MusicService } from './music.service';
import { MusicTrack, MusicTrackSchema } from './schemas/music-track.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Question.name, schema: QuestionSchema },
      { name: MusicTrack.name, schema: MusicTrackSchema },
    ]),
  ],
  controllers: [AdminMusicTracksController, MusicQuestionsController],
  providers: [MusicService, MusicMetadataAgentService],
  exports: [MusicService, MusicMetadataAgentService],
})
export class MusicModule {}
