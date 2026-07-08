import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AiService } from "./ai.service";

// Custom in-memory storage that avoids importing multer v2 directly (ESM-only package).
// Mirrors the same pattern used in uploads.controller.ts — buffers the file stream into
// file.buffer, no disk write, since this endpoint only needs to read text out of it.
const RAM_STORAGE: any = {
  _handleFile(_req: any, file: any, cb: any) {
    const chunks: Buffer[] = [];
    file.stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    file.stream.on("end", () => cb(null, { buffer: Buffer.concat(chunks) }));
    file.stream.on("error", (err: Error) => cb(err));
  },
  _removeFile(_req: any, _file: any, cb: any) { cb(null); },
};

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("extract-document-text")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 20 * 1024 * 1024 } }))
  async extractDocumentText(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file received");
    const text = await this.aiService.extractDocumentText(file);
    return { text, filename: file.originalname };
  }

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
      topic?: string;
      num_lessons?: number;
      lesson_types?: string[];
      document_text?: string;
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

  @Post("generate-certification")
  @HttpCode(HttpStatus.OK)
  generateCertification(@Body() body: { prompt: string }) {
    return this.aiService.generateCertification(body);
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
