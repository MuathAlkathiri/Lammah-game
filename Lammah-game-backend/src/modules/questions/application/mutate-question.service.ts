import { Injectable } from '@nestjs/common';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
} from '../dto/create-question.dto';
import { QuestionsService } from '../questions.service';
import { QuestionLifecyclePolicy } from '../policies/question-lifecycle.policy';

@Injectable()
export class MutateQuestionService {
  constructor(
    private readonly questions: QuestionsService,
    private readonly lifecycle: QuestionLifecyclePolicy,
  ) {}
  create(dto: CreateQuestionDto) {
    return this.questions.create(dto);
  }
  update(id: string, dto: UpdateQuestionDto) {
    if (dto.status) this.lifecycle.assertKnownStatus(dto.status);
    return this.questions.update(id, dto);
  }
  delete(id: string) {
    return this.questions.delete(id);
  }
}
