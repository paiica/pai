import { Lesson } from "@/types";

export const LESSON_CONTENT: Record<string, Partial<Lesson>> = {
  "l1": {
    video_url: "https://www.youtube.com/embed/ad79nYk2keg",
    is_preview: true,
  },
  "l2": {
    video_url: "https://www.youtube.com/embed/qYNweeDHiyU",
  },
  "l3": {
    content: `## The AI Technology Landscape

Artificial intelligence is no longer a single technology — it's an entire ecosystem of tools, platforms, and capabilities that are reshaping every industry.

### The Major Categories

**Foundation Models & Large Language Models (LLMs)**
These are the powerhouses behind tools like ChatGPT, Claude, and Gemini. Trained on vast amounts of text data, they can write, reason, summarize, and converse in natural language.

**AI Productivity Tools**
- **Writing & Content**: ChatGPT, Claude, Jasper, Copy.ai
- **Image Generation**: Midjourney, DALL-E, Stable Diffusion
- **Video**: Runway, Sora, HeyGen
- **Audio & Voice**: ElevenLabs, Whisper, Murf
- **Code**: GitHub Copilot, Cursor, Replit

**Enterprise AI Platforms**
Microsoft Copilot, Google Workspace AI, and Salesforce Einstein are embedding AI directly into the tools professionals already use.

**Vertical AI Solutions**
Industry-specific AI for healthcare (diagnosis, drug discovery), finance (fraud detection, trading), legal (contract analysis), and more.

### Key Players to Know

| Company | Key Products |
|---------|-------------|
| OpenAI | ChatGPT, GPT-4, DALL-E, Sora |
| Anthropic | Claude |
| Google | Gemini, Google AI Studio |
| Microsoft | Copilot, Azure AI |
| Meta | Llama (open source) |
| Mistral | Mistral (open source) |

### What This Means for Business Professionals

The most important insight: **you don't need to build AI — you need to know how to use it.** The competitive advantage belongs to professionals who can identify where AI adds value, select the right tools, and integrate them into workflows effectively.`,
  },
  "l4": {
    quiz_questions: [
      {
        question: "What is the primary difference between Artificial Intelligence and Machine Learning?",
        options: [
          "They are the same thing — AI and ML are interchangeable terms",
          "AI is the broader concept; ML is a specific approach where systems learn from data",
          "Machine Learning is older than Artificial Intelligence",
          "AI requires the internet; Machine Learning does not",
        ],
        correct: 1,
        explanation: "AI is the broad field of creating intelligent machines. Machine Learning is a subset of AI where systems improve through experience and data rather than explicit programming.",
      },
      {
        question: "Which of the following best describes a Large Language Model (LLM)?",
        options: [
          "A database that stores large amounts of text",
          "A translation tool that converts between programming languages",
          "An AI model trained on vast text data that can generate, summarize, and reason with language",
          "A search engine that indexes web pages",
        ],
        correct: 2,
        explanation: "LLMs like GPT-4 and Claude are trained on enormous text datasets and learn patterns that allow them to generate coherent, contextually relevant text.",
      },
      {
        question: "What does 'Generative AI' specifically refer to?",
        options: [
          "AI that generates revenue for businesses",
          "AI that can create new content — text, images, audio, video — based on prompts",
          "AI that generates its own training data automatically",
          "AI used specifically in creative industries",
        ],
        correct: 1,
        explanation: "Generative AI refers to AI systems that can produce new, original content based on input prompts — including text, images, code, audio, and video.",
      },
    ],
  },
  "l5": {
    video_url: "https://www.youtube.com/embed/JTxsNm9IdYU",
    is_preview: true,
  },
  "l6": {
    video_url: "https://www.youtube.com/embed/pZsJbYIFCCw",
  },
  "l9": {
    content: `## AI for Marketing, Sales, and Customer Service

AI is transforming revenue-generating functions faster than any other business area. Here's how to harness it.

### Marketing

**Content Creation at Scale**
Use AI to generate first drafts of blog posts, social media copy, email campaigns, and ad copy. The key is using AI as a starting point, then adding your brand voice and expertise.

*Prompt example:* "Write 5 subject line options for an email campaign promoting our Q3 webinar on AI adoption for finance teams. Tone: professional but engaging."

**Audience Segmentation**
AI tools can analyze customer data to identify micro-segments you may have missed, enabling hyper-personalized campaigns.

**SEO & Content Strategy**
Tools like Surfer SEO and MarketMuse use AI to analyze top-ranking content and suggest exactly what to include in your content to rank higher.

### Sales

**Lead Scoring**
AI can analyze hundreds of behavioral signals to predict which leads are most likely to convert, so your team focuses energy where it matters.

**Sales Outreach Personalization**
Instead of generic templates, use AI to research prospects and craft personalized outreach at scale.

**Call Analysis**
Tools like Gong and Chorus use AI to analyze sales calls, identifying what top performers do differently.

### Customer Service

**AI Chatbots for Tier-1 Support**
Modern AI chatbots can handle 60-80% of common customer queries — password resets, order status, FAQs — freeing human agents for complex issues.

**Sentiment Analysis**
Real-time AI analysis of customer messages flags frustration before it escalates to churn.

**Agent Assist**
AI tools that listen to live customer calls and surface relevant knowledge base articles, scripts, and next-best actions in real time.

### Getting Started: A 30-Day Plan

1. **Week 1**: Audit your current processes — identify the 3 most time-consuming, repetitive tasks
2. **Week 2**: Test AI tools on those specific tasks (use free tiers first)
3. **Week 3**: Measure time saved and quality of output
4. **Week 4**: Build a business case for expanded adoption`,
  },
};

export function getLessonContent(lessonId: string): Partial<Lesson> {
  return LESSON_CONTENT[lessonId] || {};
}
