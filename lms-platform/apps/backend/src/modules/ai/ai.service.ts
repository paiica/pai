import { BadRequestException, HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { SiteSettingsService } from "../site-settings/site-settings.service";

const PROVIDER_DEFAULTS: Record<string, { baseURL?: string; model: string }> = {
  openai: { model: "gpt-4o" },
  groq:   { baseURL: "https://api.groq.com/openai/v1",                              model: "llama-3.3-70b-versatile" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",    model: "gemini-2.0-flash" },
};

@Injectable()
export class AiService {
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
