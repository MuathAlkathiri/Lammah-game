import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { MediaCommandRunnerService } from './media-command-runner.service';

@Injectable()
export class MediaInspectorService {
  constructor(private readonly commands: MediaCommandRunnerService) {}

  async audioDurationSeconds(filePath: string): Promise<number> {
    const stdout = await this.commands.run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_AUDIO_FILE',
        message: 'The uploaded file is not valid audio',
      });
    }
    return Math.round(duration * 100) / 100;
  }
}
