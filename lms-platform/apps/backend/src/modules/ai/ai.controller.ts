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

  @Post("generate-course-content")
  @HttpCode(HttpStatus.OK)
  generateCourseContent(
    @Body() body: {
      lesson_title: string;
      lesson_type: string;
      topic?: string;
      course_title?: string;
      module_title?: string;
      num_questions?: number;
      word_count?: number;
      tone?: string;
      level?: string;
    },
  ) {
    return this.aiService.generateCourseContent(body);
  }

  @Post("generate-module-structure")
  @HttpCode(HttpStatus.OK)
  generateModuleStructure(
    @Body() body: {
      course_title?: string;
      module_title: string;
      topic: string;
      num_lessons: number;
    },
  ) {
    return this.aiService.generateModuleStructure(body);
  }

  @Post("generate-course-structure")
  @HttpCode(HttpStatus.OK)
  generateCourseStructure(
    @Body() body: {
      course_title: string;
      topic: string;
      num_modules: number;
      lessons_per_module: number;
    },
  ) {
    return this.aiService.generateCourseStructure(body);
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
