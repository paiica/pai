import { BadRequestException, HttpException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import { SiteSettingsService } from "../site-settings/site-settings.service";

const PROVIDER_DEFAULTS: Record<string, { baseURL?: string; model: string }> = {
  openai: { model: "gpt-4o" },
  groq:   { baseURL: "https://api.groq.com/openai/v1",                              model: "llama-3.3-70b-versatile" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",    model: "gemini-2.0-flash" },
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SiteSettingsService,
  ) {}

  async getClientAndModel(): Promise<{ client: OpenAI; model: string; provider: string }> {
    const all = await this.settings.getAll();
    const provider = all.ai_provider || "openai";
    const def = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.openai;
    const model = (all.ai_model || def.model).trim();

    let apiKey = "";
    if (provider === "groq")        apiKey = all.ai_groq_key   || "";
    else if (provider === "gemini") apiKey = all.ai_gemini_key || "";
    else                            apiKey = all.ai_openai_key || this.config.get<string>("openai.apiKey") || "";

    if (!apiKey) {
      throw new BadRequestException(
        `No API key configured for ${provider}. Add it in Settings → AI Configuration.`
      );
    }

    const client = new OpenAI({ apiKey, ...(def.baseURL ? { baseURL: def.baseURL } : {}) });
    return { client, model, provider };
  }

  async getSettings() {
    const all = await this.settings.getAll();
    return {
      provider:       all.ai_provider  || "openai",
      model:          all.ai_model     || "",
      openai_key_set: !!all.ai_openai_key,
      groq_key_set:   !!all.ai_groq_key,
      gemini_key_set: !!all.ai_gemini_key,
    };
  }

  async updateSettings(data: {
    provider?: string;
    model?: string;
    openai_key?: string;
    groq_key?: string;
    gemini_key?: string;
  }) {
    const update: Record<string, string> = {};
    if (data.provider   !== undefined) update.ai_provider   = data.provider;
    if (data.model      !== undefined) update.ai_model      = data.model;
    if (data.openai_key !== undefined) update.ai_openai_key = data.openai_key;
    if (data.groq_key   !== undefined) update.ai_groq_key   = data.groq_key;
    if (data.gemini_key !== undefined) update.ai_gemini_key = data.gemini_key;
    if (Object.keys(update).length) await this.settings.upsertMany(update);
    return this.getSettings();
  }

  async testConnection() {
    const { client, model, provider } = await this.getClientAndModel();
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Say hello in one word." }],
        max_tokens: 10,
      });
      return { ok: true, provider, model, reply: res.choices[0]?.message?.content };
    } catch (err: any) {
      const msg = err?.message ?? err?.error?.message ?? "Connection failed";
      throw new BadRequestException(`${provider} error: ${msg}`);
    }
  }

  async generateExamStructure(params: {
    exam_title: string;
    topic?: string;
    difficulty?: string;
    num_sections?: number;
    questions_per_section?: number;
    question_types?: string[];
    cert_name?: string;
    learning_objectives?: string;
    custom_prompt?: string;
  }) {
    try {
      const { client, model } = await this.getClientAndModel();

      const types = Array.isArray(params.question_types) && params.question_types.length
        ? params.question_types
        : null;

      const details: string[] = [
        `Certification: ${params.cert_name ?? "(unspecified)"}`,
        `Exam title: ${params.exam_title ?? "Untitled Exam"}`,
      ];
      if (params.topic)                         details.push(`Topic: ${params.topic}`);
      if (params.difficulty)                    details.push(`Difficulty: ${params.difficulty}`);
      if (params.num_sections != null)          details.push(`Number of sections: ${params.num_sections} (each covering a distinct sub-topic)`);
      if (params.questions_per_section != null) details.push(`Questions per section: ${params.questions_per_section}`);
      if (types)                                details.push(`Question types to distribute: ${types.join(", ")}`);
      if (params.learning_objectives)           details.push(`Learning objectives:\n${params.learning_objectives}`);

      const userPrompt = `${params.custom_prompt ? `USER DESCRIPTION (treat this as the primary instruction — override the defaults below if they conflict):\n${params.custom_prompt}\n\n` : ""}Generate a complete structured exam.

${details.join("\n")}

Return JSON: { "sections": [ { "title": "...", "description": "1-2 sentence overview of this section", "questions": [...] } ] }

Each question: { "type", "question_text": "<p>HTML</p>", "explanation": "...", "points": 1, "options"?: [...] }
Options: mcq_single→4 opts 1 correct, mcq_multiple→4-5 opts 2-3 correct, true_false→[{text:"True",...},{text:"False",...}], matching→{text,match_text,is_correct:true,sort_order}, ordering→correct order all is_correct:true, dropdown→4 opts 1 correct.
All option objects must have sort_order (0-indexed) and is_correct (boolean).`;

      let content = "";
      try {
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: "You are an expert professional certification exam writer. Output only valid JSON." },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
        content = res.choices[0]?.message?.content ?? "";
      } catch (err: any) {
        const msg = err?.message ?? err?.error?.message ?? "AI request failed";
        throw new BadRequestException(`AI error: ${msg}`);
      }

      const parsed = JSON.parse(content);
      const sections = parsed.sections ?? (Array.isArray(parsed) ? parsed : null);
      if (!Array.isArray(sections)) throw new BadRequestException("AI returned an unexpected format. Please try again.");
      return { sections };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(err?.message ?? "Failed to generate exam structure.");
    }
  }

  async generateSection(params: {
    topic?: string;
    difficulty?: string;
    num_questions?: number;
    question_types?: string[];
    cert_name?: string;
    learning_objectives?: string;
    custom_prompt?: string;
  }) {
    try {
      const { client, model } = await this.getClientAndModel();

      const types = Array.isArray(params.question_types) && params.question_types.length
        ? params.question_types
        : null;

      const details: string[] = [
        `Certification: ${params.cert_name ?? "(unspecified)"}`,
      ];
      if (params.topic)               details.push(`Topic: ${params.topic}`);
      if (params.difficulty)          details.push(`Difficulty: ${params.difficulty}`);
      if (params.num_questions != null) details.push(`Questions: ${params.num_questions}`);
      if (types)                      details.push(`Question types: ${types.join(", ")}`);
      if (params.learning_objectives) details.push(`Learning objectives:\n${params.learning_objectives}`);

      const userPrompt = `${params.custom_prompt ? `USER DESCRIPTION (treat this as the primary instruction — override the defaults below if they conflict):\n${params.custom_prompt}\n\n` : ""}Generate a single exam section.

${details.join("\n")}

Return JSON: { "section": { "title": "...", "description": "1-2 sentence overview", "questions": [...] } }

Each question: { "type", "question_text": "<p>HTML</p>", "explanation": "...", "points": 1, "options"?: [...] }
Same options rules as standard: sort_order (0-indexed), is_correct (boolean) on every option.`;

      let content = "";
      try {
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: "You are an expert professional certification exam writer. Output only valid JSON." },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
        content = res.choices[0]?.message?.content ?? "";
      } catch (err: any) {
        const msg = err?.message ?? err?.error?.message ?? "AI request failed";
        throw new BadRequestException(`AI error: ${msg}`);
      }

      const parsed = JSON.parse(content);
      const section = parsed.section ?? parsed;
      if (!section?.title) throw new BadRequestException("AI returned an unexpected format. Please try again.");
      return { section };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(err?.message ?? "Failed to generate section.");
    }
  }

  async generateExamQuestions(params: {
    topic?: string;
    difficulty?: string;
    num_questions?: number;
    question_types?: string[];
    cert_name?: string;
    learning_objectives?: string;
    section_title?: string;
    custom_prompt?: string;
  }) {
    try {
      const { client, model } = await this.getClientAndModel();
      const { cert_name, learning_objectives, section_title, custom_prompt } = params;
      const types = Array.isArray(params.question_types) && params.question_types.length
        ? params.question_types
        : null;

      const details: string[] = [
        `Certification: ${cert_name ?? "(unspecified)"}`,
      ];
      if (params.topic)               details.push(`Topic: ${params.topic}`);
      if (section_title)              details.push(`Section: ${section_title}`);
      if (params.difficulty)          details.push(`Difficulty: ${params.difficulty}`);
      if (types)                      details.push(`Question types to use (distribute evenly): ${types.join(", ")}`);
      if (learning_objectives)        details.push(`Learning objectives:\n${learning_objectives}`);

      const typeSpec = types
        ? `one of [${types.join("|")}]`
        : `most appropriate type (mcq_single, mcq_multiple, true_false, open_short, open_long, essay, fill_blank, matching, ordering, dropdown)`;

      const userPrompt = `${custom_prompt ? `USER DESCRIPTION (treat this as the primary instruction — override the defaults below if they conflict):\n${custom_prompt}\n\n` : ""}Generate ${params.num_questions != null ? params.num_questions : "an appropriate number of"} exam questions.

${details.join("\n")}

Return a JSON object: { "questions": [...] }

Each question object must have:
{
  "type": ${typeSpec},
  "question_text": "<p>HTML question text</p>",
  "explanation": "Why the correct answer is right (1-2 sentences)",
  "points": 1,
  "options": [...] // required for choice-based types
}

Options rules:
- mcq_single: 4 options, exactly 1 with is_correct:true
- mcq_multiple: 4-5 options, 2-3 with is_correct:true
- true_false: exactly [{text:"True",is_correct:BOOL,sort_order:0},{text:"False",is_correct:BOOL,sort_order:1}]
- dropdown: 4 options, exactly 1 with is_correct:true
- matching: pairs with {text:"left",match_text:"right",is_correct:true,sort_order:N}
- ordering: items in correct sequence, all is_correct:true
- open_short/open_long/essay/fill_blank: no options field needed

All option objects must have sort_order (0-indexed integer) and is_correct (boolean).`;

      let content = "";
      try {
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: "You are an expert professional certification exam writer. Output only valid JSON." },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
        content = res.choices[0]?.message?.content ?? "";
      } catch (err: any) {
        const msg = err?.message ?? err?.error?.message ?? "AI request failed";
        throw new BadRequestException(`AI error: ${msg}`);
      }

      const parsed = JSON.parse(content);
      const questions = parsed.questions ?? (Array.isArray(parsed) ? parsed : null);
      if (!Array.isArray(questions)) throw new BadRequestException("AI returned an unexpected format. Please try again.");
      return { questions };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(err?.message ?? "Failed to generate questions.");
    }
  }

  async generateCourseContent(params: {
    lesson_title: string;
    lesson_type: string;
    topic?: string;
    course_title?: string;
    module_title?: string;
    num_questions?: number;
    word_count?: number;
    tone?: string;
    level?: string;
    document_text?: string;
  }) {
    const { client, model, provider } = await this.getClientAndModel();

    const useJsonMode = provider === "openai" || provider === "groq";
    const sourceMaterial = params.document_text
      ? `\n\nSOURCE DOCUMENT — base the content on this material rather than general knowledge:\n"""\n${params.document_text.slice(0, 60000)}\n"""`
      : "";

    if (params.lesson_type === "quiz") {
      const n = params.num_questions || 5;
      const userPrompt = `Return ONLY a JSON object. Generate ${n} multiple-choice quiz questions.

Course: ${params.course_title || "(unspecified)"}
Module: ${params.module_title || "(unspecified)"}
Lesson: ${params.lesson_title}
Topic: ${params.topic || params.lesson_title}${sourceMaterial}

Required format: {"questions":[{"question_text":"...","question_type":"multiple_choice","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}

Rules: exactly 4 string options, correct_index is 0-based, no HTML in question text.${params.document_text ? " Questions must test material actually covered in the source document." : ""}`;

      let raw = "";
      try {
        const createParams: any = {
          model,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.7,
        };
        if (useJsonMode) createParams.response_format = { type: "json_object" };
        const res = await client.chat.completions.create(createParams);
        raw = res.choices[0]?.message?.content ?? "";
      } catch (err: any) {
        throw new BadRequestException(`AI error: ${err?.message ?? "Failed"}`);
      }
      try {
        const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(cleaned);
        const questions = this.extractArray(parsed, "questions");
        return { questions };
      } catch {
        this.logger.error("generateCourseContent quiz raw:", raw);
        throw new BadRequestException("AI returned unexpected format. Please try again.");
      }
    }

    const typeGuide: Record<string, string> = {
      reading:      "a comprehensive reading lesson with headings, explanatory paragraphs, key concepts, and a summary. Use <h2>, <h3>, <p>, <ul>, <li> HTML tags.",
      assignment:   "clear assignment instructions with an overview, numbered requirements, submission guidelines, and grading criteria in HTML.",
      video:        "supplementary notes for a video lesson: learning objectives, key terms, summary, and reflection questions in HTML.",
      live_session: "a session guide with learning objectives, agenda, discussion questions, and key takeaways in HTML.",
      html:         "well-formatted HTML page content with headings, paragraphs, and lists covering the topic.",
      download:     "a description and usage guide for the downloadable resource in HTML.",
    };
    const guide = typeGuide[params.lesson_type] ?? typeGuide.reading;
    const wordCount = Math.min(2500, Math.max(50, params.word_count ?? 500));
    // A single "approximately N words" mention is routinely under-followed by LLMs, which tend to
    // stop once the content feels structurally complete rather than actually hitting the target.
    // Restating the requirement as a firm minimum, plus a concrete section plan, gives the model
    // a reason to keep going instead of wrapping up early.
    const sectionCount = Math.max(2, Math.round(wordCount / 300));

    const userPrompt = `Return ONLY a JSON object. Create ${guide}

Course: ${params.course_title || "(unspecified)"}
Module: ${params.module_title || "(unspecified)"}
Lesson: ${params.lesson_title}
Topic/Focus: ${params.topic || params.lesson_title}${sourceMaterial}

LENGTH REQUIREMENT — READ CAREFULLY: The content must be AT LEAST ${wordCount} words. This is a firm minimum, not a rough guide. Structure it as roughly ${sectionCount} distinct <h2>/<h3> sections, each with multiple full paragraphs, so the length comes from real depth and detail (more examples, more explanation, more nuance) — not from padding or repetition. If you reach a natural stopping point before ${wordCount} words, keep going: add another section, more examples, or deeper explanation rather than ending the lesson short.

Requirements: ${params.tone ?? "professional"} tone, ${params.level ?? "intermediate"} level, well-structured, HTML formatted.${params.document_text ? " Content must be drawn directly from the source document, not general knowledge." : ""}

Required format: {"content":"<h2>...</h2><p>...</p>"}

Before finishing, check your draft: if it is under ${wordCount} words, expand it further.`;

    let raw = "";
    try {
      const createParams: any = {
        model,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.7,
        // Without an explicit cap, some providers (notably Groq) fall back to a low
        // default completion length regardless of what the prompt asks for — scale
        // this with the requested word count so longer lessons aren't silently cut off.
        max_tokens: Math.min(8000, wordCount * 2 + 300),
      };
      if (useJsonMode) createParams.response_format = { type: "json_object" };
      const res = await client.chat.completions.create(createParams);
      raw = res.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      throw new BadRequestException(`AI error: ${err?.message ?? "Failed"}`);
    }

    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      const content = parsed.content ?? parsed.lesson_content ?? parsed.html ?? "";
      return { content };
    } catch {
      this.logger.error("generateCourseContent raw:", raw);
      throw new BadRequestException("AI returned unexpected format. Please try again.");
    }
  }

  private extractArray(parsed: any, key: string): any[] {
    // parsed IS the array
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    // Direct key on object
    if (parsed && typeof parsed === "object" && Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
    // One level deep
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const val of Object.values(parsed)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const nested = (val as any)[key];
          if (Array.isArray(nested) && nested.length > 0) return nested;
        }
      }
      // First top-level array value (fallback)
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val) && val.length > 0) return val as any[];
      }
    }
    return [];
  }

  async extractDocumentText(file: Express.Multer.File): Promise<string> {
    const mime = file.mimetype || "";
    const name = (file.originalname || "").toLowerCase();

    try {
      if (mime === "application/pdf" || name.endsWith(".pdf")) {
        const data = await (pdfParse as any)(file.buffer);
        return (data.text ?? "").trim();
      }
      if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        name.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return (result.value ?? "").trim();
      }
      if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
        return file.buffer.toString("utf-8").trim();
      }
      throw new BadRequestException("Unsupported file type. Upload a PDF, DOCX, or plain text file.");
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(`Could not read document: ${err?.message ?? "unknown error"}`);
    }
  }

  async generateModuleStructure(params: {
    course_title?: string;
    module_title: string;
    topic?: string;
    num_lessons?: number;
    lesson_types?: string[];
    document_text?: string;
  }) {
    const { client, model, provider } = await this.getClientAndModel();
    const num = params.lesson_types?.length
      ? Math.min(20, params.lesson_types.length)
      : params.num_lessons != null
        ? Math.min(20, Math.max(1, params.num_lessons))
        : undefined;

    const typeInstructions = params.lesson_types?.length
      ? `Lesson types, in order — use exactly these, one per lesson, in this exact sequence:\n${params.lesson_types.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "type must be one of: reading, video, quiz, assignment, download, live_session — mix types sensibly, starting with reading/intro and ending with quiz when there are 3+ lessons";

    const sourceMaterial = params.document_text
      ? `\n\nSOURCE DOCUMENT — base the lessons on this material, breaking it into logical topics/sections in a sensible teaching order:\n"""\n${params.document_text.slice(0, 60000)}\n"""`
      : "";

    const userPrompt = `You are an instructional design expert. Return ONLY a JSON object with no extra text.

Task: Design ${num != null ? num : "an appropriate number of"} lessons for a course module.

Course: ${params.course_title || "(unspecified)"}
Module: ${params.module_title}
${params.topic ? `Topic / Goals: ${params.topic}` : ""}${sourceMaterial}

Required JSON format:
{"lessons":[{"title":"Lesson title","type":"reading","topic":"What this lesson covers"}]}

Rules:
${num != null ? `- Exactly ${num} objects in the lessons array` : "- Choose however many lessons best represent the material, typically 3-10"}
- ${typeInstructions}
- Each title and topic must be specific and unique${params.document_text ? "\n- Lesson topics must be drawn directly from the source document, covering it in a logical sequence" : ""}`;

    let raw = "";
    try {
      const createParams: any = {
        model,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.5,
        max_tokens: 3072,
      };
      if (provider === "openai" || provider === "groq") {
        createParams.response_format = { type: "json_object" };
      }
      const res = await client.chat.completions.create(createParams);
      raw = res.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      throw new BadRequestException(`AI error: ${err?.message ?? "Failed"}`);
    }
    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      const lessons = this.extractArray(parsed, "lessons");
      if (!lessons.length) throw new Error("empty");
      return { lessons };
    } catch {
      this.logger.error("generateModuleStructure raw response:", raw);
      throw new BadRequestException(`AI returned unexpected format. Raw: ${raw.substring(0, 400)}`);
    }
  }

  async generateCourseStructure(params: {
    course_title: string;
    topic: string;
    num_modules: number;
    lessons_per_module: number;
  }) {
    const { client, model, provider } = await this.getClientAndModel();
    const mods = Math.min(10, Math.max(1, params.num_modules));
    const lpm  = Math.min(10, Math.max(1, params.lessons_per_module));

    const userPrompt = `You are an instructional design expert. Return ONLY a JSON object with no extra text.

Task: Design a complete course with ${mods} modules, each containing ${lpm} lessons.

Course: ${params.course_title}
Topic / Goals: ${params.topic}

Required JSON format:
{"modules":[{"title":"Module title","description":"One sentence summary","lessons":[{"title":"Lesson title","type":"reading","topic":"What this lesson covers"}]}]}

Rules:
- Exactly ${mods} module objects in the modules array
- Each module must have exactly ${lpm} lesson objects in its lessons array
- Lesson types: reading, video, quiz, assignment, download, live_session — vary per module
- Modules progress logically: foundations → intermediate → advanced → application
- End each module with quiz when lpm >= 3
- All titles must be specific and unique`;

    let raw = "";
    try {
      const createParams: any = {
        model,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.5,
        max_tokens: 4096,
      };
      if (provider === "openai" || provider === "groq") {
        createParams.response_format = { type: "json_object" };
      }
      const res = await client.chat.completions.create(createParams);
      raw = res.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      throw new BadRequestException(`AI error: ${err?.message ?? "Failed"}`);
    }
    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      const modules = this.extractArray(parsed, "modules");
      if (!modules.length) throw new Error("empty");
      return { modules };
    } catch {
      this.logger.error("generateCourseStructure raw response:", raw);
      throw new BadRequestException(`AI returned unexpected format. Raw: ${raw.substring(0, 400)}`);
    }
  }

  async generateCertification(params: { prompt: string }) {
    const { client, model, provider } = await this.getClientAndModel();
    const { prompt } = params;

    const userPrompt = `Design a complete professional certification program based on this description:

"${prompt}"

Return ONLY a JSON object with this exact shape (fill in every field with realistic, specific content — never placeholders like "Lorem ipsum" or "TBD"):

{
  "acronym": "3-6 letter code, e.g. CAIP",
  "title": "Full certification name",
  "level": "pre_certificate | foundation | advanced | specialist | executive",
  "badge_icon": "single emoji",
  "description": "1-2 sentence catalog summary",
  "long_description": "3-5 sentence hero description",
  "price": 499,
  "duration_weeks": 6,
  "total_lessons": 40,
  "total_hours": 30,
  "passing_score": 70,
  "exam_duration_minutes": 90,
  "exam_questions_count": 75,
  "validity_years": 2,
  "max_retakes_included": 2,
  "retake_fee": 99,
  "min_years_experience": 0,
  "min_training_hours": 0,
  "learning_outcomes": ["5-8 specific outcomes"],
  "target_audience": ["4-6 audience descriptions"],
  "skills": ["6-10 specific skills taught"],
  "curriculum_overview": [{ "title": "Module title", "description": "1 sentence", "lessons": 6 }],
  "faqs_json": [{ "question": "...", "answer": "..." }],
  "testimonials": [{ "name": "Full Name", "role": "Job Title", "company": "Company", "quote": "...", "avatar_initials": "AB" }],
  "marketing_meta": {
    "reviews_rating": "4.9",
    "reviews_count": "1,200+",
    "social_proof": "Join 3,200+ certified professionals",
    "hero_badge_label": "Professional Certification",
    "prerequisites": "...",
    "enrollment_includes": ["4 items"],
    "page_tabs": {
      "right_for_you": {
        "headline": "...", "body": "...",
        "stats": [{ "value": "...", "label": "..." }],
        "requirements": ["..."],
        "not_ready_text": "...", "not_ready_href": "/certifications"
      },
      "path":        { "headline": "...", "body": "...", "steps":     [{ "title": "...", "description": "..." }] },
      "prepare":     { "headline": "...", "body": "...", "resources": [{ "title": "...", "description": "..." }] },
      "maintenance": { "headline": "...", "body": "...", "renewal_items": ["..."] }
    }
  }
}

Rules:
- curriculum_overview: 5-8 modules, lesson counts should sum close to total_lessons
- faqs_json: 5-8 realistic Q&As specific to this certification
- testimonials: exactly 3, varied names/roles/companies
- Every string must be real, specific content — never generic filler`;

    let raw = "";
    try {
      const createParams: any = {
        model,
        messages: [
          { role: "system", content: "You are an expert curriculum designer and copywriter for a professional AI certification body. Output only valid JSON, no markdown fences, no commentary." },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4096,
      };
      if (provider === "openai" || provider === "groq") {
        createParams.response_format = { type: "json_object" };
      }
      const res = await client.chat.completions.create(createParams);
      raw = res.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      const msg = err?.message ?? err?.error?.message ?? "AI request failed";
      throw new BadRequestException(`AI error: ${msg}`);
    }

    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      return this.normalizeCertificationDraft(parsed);
    } catch {
      this.logger.error("generateCertification raw response:", raw);
      throw new BadRequestException("AI returned an unexpected format. Please try again.");
    }
  }

  private normalizeCertificationDraft(raw: any) {
    const s   = (v: any, d = "") => (typeof v === "string" ? v : d);
    const n   = (v: any, d = 0) => (typeof v === "number" && !isNaN(v) ? v : d);
    const arr = (v: any) => (Array.isArray(v) ? v : []);
    const obj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const strs = (v: any) => arr(v).filter((x: any) => typeof x === "string");

    const mm   = obj(raw.marketing_meta);
    const pt   = obj(mm.page_tabs);
    const rfy  = obj(pt.right_for_you);
    const path = obj(pt.path);
    const prep = obj(pt.prepare);
    const mnt  = obj(pt.maintenance);

    return {
      acronym:               s(raw.acronym).toUpperCase().slice(0, 10),
      title:                 s(raw.title),
      level:                 ["pre_certificate", "foundation", "advanced", "specialist", "executive", "other"].includes(raw.level) ? raw.level : "foundation",
      badge_icon:            s(raw.badge_icon, "🎓"),
      description:           s(raw.description),
      long_description:      s(raw.long_description),
      price:                 n(raw.price, 499),
      duration_weeks:        n(raw.duration_weeks, 6),
      total_lessons:         n(raw.total_lessons, 30),
      total_hours:           n(raw.total_hours, 20),
      passing_score:         n(raw.passing_score, 70),
      exam_duration_minutes: n(raw.exam_duration_minutes, 90),
      exam_questions_count:  n(raw.exam_questions_count, 75),
      validity_years:        n(raw.validity_years, 2),
      max_retakes_included:  n(raw.max_retakes_included, 2),
      retake_fee:            n(raw.retake_fee, 99),
      min_years_experience:  n(raw.min_years_experience, 0),
      min_training_hours:    n(raw.min_training_hours, 0),
      learning_outcomes:     strs(raw.learning_outcomes),
      target_audience:       strs(raw.target_audience),
      skills:                strs(raw.skills),
      curriculum_overview: arr(raw.curriculum_overview).map((c: any) => ({
        title: s(c?.title), description: s(c?.description), lessons: n(c?.lessons, 4),
      })),
      faqs_json: arr(raw.faqs_json).map((f: any) => ({ question: s(f?.question), answer: s(f?.answer) })),
      testimonials: arr(raw.testimonials).map((t: any) => ({
        name: s(t?.name), role: s(t?.role), company: s(t?.company), quote: s(t?.quote), avatar_initials: s(t?.avatar_initials),
      })),
      marketing_meta: {
        reviews_rating:      s(mm.reviews_rating, "4.9"),
        reviews_count:       s(mm.reviews_count, "1,200+"),
        social_proof:        s(mm.social_proof),
        hero_badge_label:    s(mm.hero_badge_label, "Professional Certification"),
        prerequisites:       s(mm.prerequisites),
        enrollment_includes: strs(mm.enrollment_includes),
        page_tabs: {
          right_for_you: {
            headline:       s(rfy.headline),
            body:           s(rfy.body),
            stats:          arr(rfy.stats).map((x: any) => ({ value: s(x?.value), label: s(x?.label) })),
            requirements:   strs(rfy.requirements),
            not_ready_text: s(rfy.not_ready_text),
            not_ready_href: s(rfy.not_ready_href, "/certifications"),
          },
          path: {
            headline: s(path.headline),
            body:     s(path.body),
            steps:    arr(path.steps).map((x: any) => ({ title: s(x?.title), description: s(x?.description) })),
          },
          prepare: {
            headline:  s(prep.headline),
            body:      s(prep.body),
            resources: arr(prep.resources).map((x: any) => ({ title: s(x?.title), description: s(x?.description) })),
          },
          maintenance: {
            headline:      s(mnt.headline),
            body:          s(mnt.body),
            renewal_items: strs(mnt.renewal_items),
          },
        },
      },
    };
  }

  async improveQuestion(params: { question: object; action: string; cert_name?: string }) {
    const { client, model } = await this.getClientAndModel();
    const { question, action, cert_name } = params;

    const actionInstructions: Record<string, string> = {
      improve:              "Improve the clarity, accuracy, and quality. Fix grammar, remove ambiguity, and strengthen distractors.",
      rewrite:              "Completely rewrite on the same topic and difficulty, keeping the same question type.",
      increase_difficulty:  "Increase difficulty significantly. Require deeper knowledge, add nuance, or make distractors more plausible.",
      simplify:             "Simplify for beginners. Keep the same topic and question type.",
      add_distractors:      "Improve the distractor (wrong) options to be more challenging and plausible. Keep the question text and correct answer unchanged.",
      generate_explanation: "Keep the question and options exactly unchanged. Write a comprehensive 2-3 sentence explanation for why the correct answer is right.",
      alternative_version:  "Create an alternative version testing the same concept in a different way (different scenario, wording, or angle).",
    };

    const userPrompt = `${actionInstructions[action] ?? "Improve this question."}
${cert_name ? `\nCertification: ${cert_name}` : ""}

Current question:
${JSON.stringify(question, null, 2)}

Return a JSON object: { "question": { ...improved question with same structure } }

The returned question must include: type, question_text (HTML string), explanation, points, and options (if the type requires them).`;

    let content = "";
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are an expert professional certification exam writer. Output only valid JSON." },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });
      content = res.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      const msg = err?.message ?? err?.error?.message ?? "AI request failed";
      throw new BadRequestException(`AI error: ${msg}`);
    }

    try {
      const parsed = JSON.parse(content);
      return { question: parsed.question ?? parsed };
    } catch {
      throw new BadRequestException("AI returned an unexpected format. Please try again.");
    }
  }
}
