import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AiService } from "./ai.service";

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("settings")
  getSettings() {
    return this.aiService.getSettings();
  }

  @Patch("settings")
  @HttpCode(HttpStatus.OK)
  updateSettings(
    @Body() body: {
      provider?: string;
      model?: string;
      openai_key?: string;
      groq_key?: string;
      gemini_key?: string;
    },
  ) {
    return this.aiService.updateSettings(body);
  }

  @Post("test")
  @HttpCode(HttpStatus.OK)
  testConnection() {
    return this.aiService.testConnection();
  }

  @Post("generate-exam-questions")
  @HttpCode(HttpStatus.OK)
  generateExamQuestions(
    @Body() body: {
      topic: string;
      difficulty: string;
      num_questions: number;
      question_types: string[];
      cert_name?: string;
      learning_objectives?: string;
      section_title?: string;
      custom_prompt?: string;
    },
  ) {
    return this.aiService.generateExamQuestions(body);
  }

  @Post("improve-question")
  @HttpCode(HttpStatus.OK)
  improveQuestion(
    @Body() body: {
      question: object;
      action: string;
      cert_name?: string;
    },
  ) {
    return this.aiService.improveQuestion(body);
  }

  @Post("generate-exam-structure")
  @HttpCode(HttpStatus.OK)
  generateExamStructure(
    @Body() body: {
      exam_title: string;
      topic: string;
      difficulty: string;
      num_sections: number;
      questions_per_section: number;
      question_types: string[];
      cert_name?: string;
      learning_objectives?: string;
      custom_prompt?: string;
    },
  ) {
    return this.aiService.generateExamStructure(body);
  }

  @Post("generate-section")
  @HttpCode(HttpStatus.OK)
  generateSection(
    @Body() body: {
      topic: string;
      difficulty: string;
      num_questions: number;
      question_types: string[];
      cert_name?: string;
      learning_objectives?: string;
      custom_prompt?: string;
    },
  ) {
    return this.aiService.generateSection(body);
  }
}
