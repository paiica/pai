/**
 * Seeds the "AI Foundations" standalone course — a 12-week, beginner-to-intermediate
 * introduction to AI/ML/DL, adapted by PAII from the open (MIT-licensed) "AI For
 * Beginners" curriculum. Original explanatory text below is PAII's own; hands-on
 * notebooks are linked back to the source repo as lesson resources, with attribution
 * in the course description per MIT license terms.
 *
 * Created as status: draft / is_listed: false — review in the admin course builder
 * and publish manually when ready.
 *
 * Run with: npx ts-node prisma/seed-ai-foundations.ts
 * Safe to re-run (upserts the course by slug; skips module/lesson creation if they
 * already exist for this course).
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, LessonType, QuestionType, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

const REPO = "https://github.com/hassanchamas/AI-For-Beginners/tree/main";

type QuizDef = { question_text: string; options: string[]; correct_index: number; explanation?: string; points?: number }[];

type LessonDef = {
  title: string;
  duration_minutes: number;
  content_body?: string;
  quiz?: QuizDef;
  resource?: { title: string; path: string };
  is_free_preview?: boolean;
};

type ModuleDef = { title: string; description: string; lessons: LessonDef[] };

const modules: ModuleDef[] = [
  {
    title: "Week 0: Course Setup",
    description: "Get your development environment ready before diving into the curriculum.",
    lessons: [
      {
        title: "Setting Up Your AI Development Environment",
        duration_minutes: 15,
        is_free_preview: true,
        content_body: `<h3>Choosing Your Tools</h3><p>You'll need Python 3.9+, a code editor (VS Code is recommended), and Jupyter Notebook support. The fastest path is VS Code with the Python and Jupyter extensions installed — this lets you run notebook cells, inspect variables, and debug in one place.</p><h3>Virtual Environments</h3><p>Always isolate project dependencies with <code>venv</code> or <code>conda</code>. This course uses both PyTorch and TensorFlow across different lessons; keeping them in a dedicated environment avoids version conflicts with other projects on your machine.</p><h3>Zero-Install Option</h3><p>If you'd rather skip local setup entirely, GitHub Codespaces or Google Colab let you run every notebook in this course directly in the browser, with GPU access available on Colab's free tier for the deep learning lessons later on.</p>`,
        resource: { title: "Setup guide & environment files", path: "lessons/0-course-setup/setup.md" },
      },
    ],
  },
  {
    title: "Week I: Introduction to AI",
    description: "Where AI came from, and how today's landscape took shape.",
    lessons: [
      {
        title: "What Is Artificial Intelligence? A Brief History",
        duration_minutes: 25,
        is_free_preview: true,
        content_body: `<h3>Defining the Field</h3><p>Artificial intelligence is the study of building systems that perform tasks which would normally require human intelligence — reasoning, perception, language, and decision-making. The term was coined at the 1956 Dartmouth Workshop, where researchers optimistically predicted human-level machine intelligence within a generation.</p><h3>Two Competing Paradigms</h3><p>AI's history has swung between two approaches. <strong>Symbolic AI</strong> (1950s–1980s) tried to hand-encode human knowledge as logical rules. <strong>Connectionism</strong>, inspired by biological neurons, instead tries to make systems learn patterns directly from data. After two "AI winters" caused by overpromising and underdelivering, it was the connectionist approach — powered by GPUs and large datasets — that produced the deep learning breakthroughs from 2012 onward.</p><h3>Narrow AI vs. General AI</h3><p>Every AI system in production use today is <strong>narrow AI</strong>: excellent at one class of task (translation, image recognition, code generation) but with no general understanding outside it. <strong>Artificial General Intelligence (AGI)</strong> — a system with human-like broad reasoning — remains a research goal, not a deployed reality.</p>`,
      },
      {
        title: "Module 1 Knowledge Check",
        duration_minutes: 12,
        quiz: [
          { question_text: "The 1956 Dartmouth Workshop is significant because it:", options: ["Produced the first working neural network", "Coined the term \"Artificial Intelligence\" and launched the field", "Introduced the transformer architecture", "Proved AGI was achievable within 5 years"], correct_index: 1, points: 2 },
          { question_text: "\"AI winters\" refers to periods of reduced funding and interest following overhyped promises.", options: ["True", "False"], correct_index: 0, points: 1 },
          { question_text: "Which best describes today's most capable deployed AI systems?", options: ["Artificial General Intelligence (AGI)", "Symbolic reasoning engines only", "Narrow AI, excellent at specific tasks", "Systems with human-equivalent general reasoning"], correct_index: 2, points: 2 },
        ],
      },
    ],
  },
  {
    title: "Week II: Symbolic AI",
    description: "The 'good old-fashioned AI' era — rules, logic, and expert systems.",
    lessons: [
      {
        title: "Knowledge Representation and Expert Systems",
        duration_minutes: 25,
        content_body: `<h3>Encoding Knowledge as Rules</h3><p>Before machine learning dominated, researchers tried to capture human expertise directly as logical rules and structured knowledge — an approach now nicknamed GOFAI ("Good Old-Fashioned AI"). Techniques included semantic networks (concepts linked by labeled relationships), frames (structured templates for stereotypical situations), and production rule systems (if-then chains that mimic expert reasoning).</p><h3>Expert Systems in Practice</h3><p>The clearest commercial success of this era was the expert system — software that encoded a domain specialist's rules to make decisions. MYCIN, built at Stanford to recommend antibiotic treatments, could reason through hundreds of rules about bacterial infections. Expert systems worked well in narrow, well-understood domains with clear rules.</p><h3>Why Symbolic AI Hit a Ceiling</h3><p>Two problems proved fatal at scale: the <strong>knowledge acquisition bottleneck</strong> (manually encoding expert knowledge doesn't scale to messy, ambiguous real-world domains) and <strong>brittleness</strong> (rule-based systems fail ungracefully on situations their designers didn't anticipate). These limitations are exactly what statistical machine learning — learning patterns from data instead of hand-coding them — was built to solve.</p>`,
        resource: { title: "Symbolic AI lesson & notebook", path: "lessons/2-Symbolic" },
      },
      {
        title: "Module 2 Knowledge Check",
        duration_minutes: 10,
        quiz: [
          { question_text: "What is the \"knowledge acquisition bottleneck\"?", options: ["GPUs being too slow to train models", "The difficulty of manually encoding expert knowledge as rules at scale", "A limit on how much data a neural network can store", "The cost of labeling training data"], correct_index: 1, points: 2 },
          { question_text: "Expert systems like MYCIN used machine learning trained on labeled patient outcomes.", options: ["True", "False"], correct_index: 1, explanation: "MYCIN used hand-coded if-then rules, not learned statistical patterns.", points: 1 },
        ],
      },
    ],
  },
  {
    title: "Week III: Neural Network Foundations",
    description: "From a single perceptron to building and training your own framework.",
    lessons: [
      {
        title: "The Perceptron: Your First Neural Network",
        duration_minutes: 30,
        content_body: `<h3>The Simplest Neural Unit</h3><p>The perceptron, introduced by Frank Rosenblatt in 1958, is the ancestor of every modern neural network. It takes a set of weighted inputs, sums them, and passes the result through a step function to produce a binary output. Training a perceptron means adjusting those weights so the output matches the correct label — the same core idea (gradient-based weight updates) that powers today's largest deep learning models.</p><h3>What It Can and Can't Do</h3><p>A single perceptron can only learn <em>linearly separable</em> patterns — problems where a straight line (or hyperplane) can divide the classes. Marvin Minsky and Seymour Papert's 1969 analysis of this limitation, most famously the perceptron's inability to learn XOR, contributed to the first AI winter by dampening enthusiasm for neural approaches for over a decade.</p><h3>Lab</h3><p>The accompanying notebook has you implement a perceptron from scratch in NumPy and train it on a simple classification dataset, so you can see the weight-update rule directly rather than through a framework's abstraction.</p>`,
        resource: { title: "Perceptron lesson & hands-on lab", path: "lessons/3-NeuralNetworks/03-Perceptron" },
      },
      {
        title: "Building a Neural Network Framework From Scratch",
        duration_minutes: 35,
        content_body: `<h3>Stacking Layers</h3><p>A single perceptron is limited, but stacking layers of them — with a non-linear activation function between layers — lets a network approximate arbitrarily complex functions. This is the Multi-Layer Perceptron (MLP), and the algorithm that makes training it possible is <strong>backpropagation</strong>: computing how much each weight contributed to the final error, then adjusting it via gradient descent.</p><h3>Why Build One Yourself First</h3><p>Every modern deep learning framework (PyTorch, TensorFlow) hides backpropagation behind an automatic differentiation engine. This lesson has you implement forward pass, loss calculation, and backward pass by hand in a small custom framework — once you've done that once, framework abstractions stop feeling like magic and start feeling like conveniences.</p>`,
        resource: { title: "Custom framework lesson & lab", path: "lessons/3-NeuralNetworks/04-OwnFramework" },
      },
      {
        title: "Deep Learning Frameworks and Overfitting",
        duration_minutes: 30,
        content_body: `<h3>PyTorch, TensorFlow, and Keras</h3><p>With the fundamentals covered by hand, this lesson switches to production frameworks. PyTorch's define-by-run execution model tends to feel more like regular Python and is dominant in research; TensorFlow (with the Keras high-level API) emphasizes deployment and production tooling. Both compute gradients automatically and run efficiently on GPUs.</p><h3>Overfitting: The Central Failure Mode</h3><p>A model that memorizes its training data instead of learning generalizable patterns will perform well on training data and poorly on new data — this is overfitting. Watch for a widening gap between training and validation loss as the clearest signal. Common countermeasures covered here include holding out a validation set, regularization (L1/L2, dropout), early stopping, and simply gathering more training data.</p>`,
        resource: { title: "Frameworks lesson & lab", path: "lessons/3-NeuralNetworks/05-Frameworks" },
      },
      {
        title: "Module 3 Knowledge Check",
        duration_minutes: 12,
        quiz: [
          { question_text: "A single perceptron cannot learn the XOR function because:", options: ["It has too many parameters", "XOR is not linearly separable", "XOR requires a convolutional layer", "The step function is too slow to compute"], correct_index: 1, points: 2 },
          { question_text: "Backpropagation is the algorithm used to compute how each weight contributed to a network's error.", options: ["True", "False"], correct_index: 0, points: 1 },
          { question_text: "A widening gap between training loss (low) and validation loss (high) is the clearest sign of:", options: ["Underfitting", "Overfitting", "A learning rate that's too low", "Vanishing gradients"], correct_index: 1, points: 2 },
        ],
      },
    ],
  },
  {
    title: "Week IV: Computer Vision",
    description: "From basic image processing to CNNs, transfer learning, GANs, and segmentation.",
    lessons: [
      {
        title: "Introduction to Computer Vision and OpenCV",
        duration_minutes: 25,
        content_body: `<p>Before neural networks, computer vision relied on hand-engineered feature extraction — edge detection, corner detection, and filters like Sobel and Canny — to turn raw pixels into signals a classical algorithm could use. This lesson covers those fundamentals using OpenCV: loading, transforming, and filtering images, which remains essential preprocessing knowledge even in a deep-learning-first pipeline.</p>`,
        resource: { title: "Intro CV lesson & lab", path: "lessons/4-ComputerVision/06-IntroCV" },
      },
      {
        title: "Convolutional Neural Networks & Architectures",
        duration_minutes: 35,
        content_body: `<h3>Why Convolutions</h3><p>A fully-connected layer applied directly to image pixels ignores spatial structure and doesn't scale — a 224×224 color image has over 150,000 input values. Convolutional layers instead slide small learned filters across the image, detecting local patterns (edges, textures, then shapes) that combine into higher-level features as depth increases, while sharing weights across positions to keep parameter counts manageable.</p><h3>Landmark Architectures</h3><p>This lesson walks through the architectures that defined the field's progress: LeNet (1998, digit recognition), AlexNet (2012, the ImageNet result that kicked off the deep learning boom), VGG (depth via simple stacked 3×3 convolutions), and ResNet (skip connections that made training very deep networks tractable).</p>`,
        resource: { title: "CNNs lesson & lab", path: "lessons/4-ComputerVision/07-ConvNets" },
      },
      {
        title: "Pre-trained Networks and Transfer Learning",
        duration_minutes: 30,
        content_body: `<p>Training a CNN from scratch requires huge labeled datasets most projects don't have. Transfer learning instead takes a network pre-trained on a large dataset (typically ImageNet) and either uses it as a fixed feature extractor or fine-tunes its later layers on your smaller, task-specific dataset. This lesson covers when to freeze vs. fine-tune, and why transfer learning has become the default starting point for most real-world vision projects.</p>`,
        resource: { title: "Transfer learning lesson & lab", path: "lessons/4-ComputerVision/08-TransferLearning" },
      },
      {
        title: "Autoencoders and Variational Autoencoders",
        duration_minutes: 25,
        content_body: `<p>An autoencoder learns to compress an input into a low-dimensional latent representation and then reconstruct it — useful for denoising, dimensionality reduction, and anomaly detection (inputs that reconstruct poorly are likely outliers). Variational Autoencoders (VAEs) extend this by learning a smooth, probabilistic latent space, which makes them usable as generative models: sampling a point from the latent space and decoding it produces a novel, plausible output.</p>`,
        resource: { title: "Autoencoders lesson", path: "lessons/4-ComputerVision/09-Autoencoders" },
      },
      {
        title: "Generative Adversarial Networks & Style Transfer",
        duration_minutes: 30,
        content_body: `<h3>Two Networks in Competition</h3><p>A GAN pits a <strong>generator</strong> (which tries to produce realistic fake images) against a <strong>discriminator</strong> (which tries to tell real from fake) in a minimax game. As training proceeds, the generator gets better at fooling the discriminator, and the discriminator gets better at catching it — in the ideal case, converging to a generator that produces convincingly realistic outputs.</p><h3>Neural Style Transfer</h3><p>A related but distinct technique, style transfer optimizes an image to match the content of one image and the artistic style (texture, color, brushwork) of another, by matching feature-map statistics inside a pre-trained CNN rather than training a new generative model.</p>`,
        resource: { title: "GANs & style transfer lesson", path: "lessons/4-ComputerVision/10-GANs" },
      },
      {
        title: "Object Detection",
        duration_minutes: 30,
        content_body: `<p>Classification tells you <em>what</em> is in an image; object detection tells you <em>what and where</em>, drawing bounding boxes around each instance. This lesson covers the two dominant families: two-stage detectors like Faster R-CNN (propose regions, then classify each), and single-stage detectors like YOLO and SSD (predict boxes and classes in one pass, trading a little accuracy for real-time speed).</p>`,
        resource: { title: "Object detection lesson & lab", path: "lessons/4-ComputerVision/11-ObjectDetection" },
      },
      {
        title: "Semantic Segmentation and U-Net",
        duration_minutes: 25,
        content_body: `<p>Segmentation pushes detection to its logical limit: classifying every individual pixel rather than drawing a box. U-Net's encoder-decoder architecture, with skip connections carrying fine spatial detail from early layers directly to late layers, became the standard approach — originally designed for biomedical image segmentation, now used broadly wherever pixel-precise masks are needed.</p>`,
        resource: { title: "Segmentation lesson", path: "lessons/4-ComputerVision/12-Segmentation" },
      },
      {
        title: "Module 4 Knowledge Check",
        duration_minutes: 15,
        quiz: [
          { question_text: "Why do CNNs use convolutional layers instead of fully-connected layers on raw pixels?", options: ["Convolutions are always faster on CPUs", "They exploit spatial structure and share weights, keeping parameter counts manageable", "Fully-connected layers can't process color images", "Convolutions don't require labeled data"], correct_index: 1, points: 2 },
          { question_text: "Transfer learning is most useful when you have a large, task-specific labeled dataset and want to train from random initialization.", options: ["True", "False"], correct_index: 1, explanation: "Transfer learning is most valuable when your own labeled dataset is small.", points: 1 },
          { question_text: "In a GAN, the discriminator's role is to:", options: ["Generate new images", "Compress images into a latent space", "Distinguish real images from generator-produced fakes", "Draw bounding boxes around objects"], correct_index: 2, points: 2 },
          { question_text: "What distinguishes semantic segmentation from object detection?", options: ["Segmentation classifies every pixel; detection draws bounding boxes", "Segmentation is faster to train", "Detection only works on grayscale images", "Segmentation doesn't use CNNs"], correct_index: 0, points: 2 },
        ],
      },
    ],
  },
  {
    title: "Week V: Natural Language Processing",
    description: "From bag-of-words to embeddings, RNNs, transformers, and large language models.",
    lessons: [
      {
        title: "Text Representation: Bag of Words and TF-IDF",
        duration_minutes: 25,
        content_body: `<p>Machine learning models need numbers, not words. Bag-of-words represents a document as a vector of word counts, discarding order entirely. TF-IDF improves on raw counts by weighting each word by how distinctive it is to a document relative to the whole corpus — common words like "the" get down-weighted, rare and informative words get up-weighted. Both remain useful, computationally cheap baselines even in an era dominated by learned embeddings.</p>`,
        resource: { title: "Text representation lesson", path: "lessons/5-NLP/13-TextRep" },
      },
      {
        title: "Semantic Word Embeddings: Word2Vec and GloVe",
        duration_minutes: 25,
        content_body: `<p>Bag-of-words treats every word as unrelated to every other. Word embeddings fix this by learning a dense vector per word such that semantically similar words end up close together in vector space — famously enabling arithmetic like <code>king − man + woman ≈ queen</code>. Word2Vec learns these vectors by predicting a word from its context (or vice versa); GloVe instead factorizes global word co-occurrence statistics. Both produce static embeddings — one fixed vector per word, regardless of context.</p>`,
        resource: { title: "Embeddings lesson", path: "lessons/5-NLP/14-Embeddings" },
      },
      {
        title: "Language Modeling and Custom Embeddings",
        duration_minutes: 25,
        content_body: `<p>A language model predicts the next word (or token) given the preceding sequence — the same fundamental objective, at vastly larger scale, that underlies modern chat models. This lesson has you train embeddings on your own corpus rather than using pre-trained Word2Vec/GloVe vectors, which matters when your domain's vocabulary (medical, legal, technical) differs significantly from general web text.</p>`,
        resource: { title: "Language modeling lab", path: "lessons/5-NLP/15-LanguageModeling" },
      },
      {
        title: "Recurrent Neural Networks",
        duration_minutes: 25,
        content_body: `<p>Text is sequential — word order carries meaning that bag-of-words and static embeddings discard. RNNs process a sequence one token at a time, carrying a hidden state forward that summarizes everything seen so far. LSTMs and GRUs extend the basic RNN with gating mechanisms that help preserve information over longer sequences, addressing the vanishing-gradient problem that limits plain RNNs on long inputs.</p>`,
        resource: { title: "RNNs lesson", path: "lessons/5-NLP/16-RNN" },
      },
      {
        title: "Generative Recurrent Networks",
        duration_minutes: 25,
        content_body: `<p>The same RNN architecture used for classification can generate text: predict the next character or word, sample it, feed it back in as input, and repeat. This lesson has you train a character-level generative RNN and observe how output quality and coherence depend on training data volume, sequence length, and sampling temperature (how much randomness vs. always picking the most likely token).</p>`,
        resource: { title: "Generative RNNs lab", path: "lessons/5-NLP/17-GenerativeNetworks" },
      },
      {
        title: "Transformers and BERT",
        duration_minutes: 30,
        content_body: `<h3>Attention Instead of Recurrence</h3><p>RNNs process sequences step by step, which is slow to train and struggles with long-range dependencies. The transformer architecture (2017) replaced recurrence with <strong>self-attention</strong>: every token directly attends to every other token in the sequence in parallel, letting the model learn long-range relationships efficiently and train much faster on modern hardware.</p><h3>BERT and Contextual Embeddings</h3><p>Unlike Word2Vec's static embeddings, BERT produces <strong>contextual</strong> embeddings — the vector for "bank" differs depending on whether the sentence is about rivers or finance. BERT is pre-trained on masked-word prediction across huge text corpora, then fine-tuned on specific downstream tasks (classification, question answering) with comparatively little task-specific data.</p>`,
        resource: { title: "Transformers & BERT lesson", path: "lessons/5-NLP/18-Transformers" },
      },
      {
        title: "Named Entity Recognition",
        duration_minutes: 20,
        content_body: `<p>Named Entity Recognition (NER) tags spans of text as belonging to categories like person, organization, location, or date — the backbone of extracting structured information from unstructured text (resumes, contracts, news articles). This lesson covers sequence-labeling approaches (BIO tagging) and how modern NER systems build on the transformer-based contextual embeddings from the previous lesson.</p>`,
        resource: { title: "NER lesson & lab", path: "lessons/5-NLP/19-NER" },
      },
      {
        title: "Large Language Models and Prompt Programming",
        duration_minutes: 30,
        content_body: `<h3>Scale Changes Behavior</h3><p>Large language models extend the transformer architecture to billions of parameters, trained on internet-scale text. Past a certain scale, models exhibit <strong>few-shot</strong> and <strong>zero-shot</strong> learning — performing new tasks from a handful of examples in the prompt, or a plain instruction, with no gradient updates at all.</p><h3>Prompting as a Skill</h3><p>Because LLMs respond so strongly to how a task is framed, prompt design has become a genuine skill: providing examples (few-shot), asking the model to reason step by step (chain-of-thought), specifying an output format, and giving the model a role or persona all measurably change output quality. This lesson closes the NLP module by connecting the sequence-modeling concepts from earlier lessons to how today's LLM-based products actually behave.</p>`,
        resource: { title: "LLMs & prompting lesson", path: "lessons/5-NLP/20-LangModels" },
      },
      {
        title: "Module 5 Knowledge Check",
        duration_minutes: 15,
        quiz: [
          { question_text: "What key limitation of static word embeddings (Word2Vec, GloVe) does BERT address?", options: ["Static embeddings can't represent nouns", "Static embeddings give one fixed vector per word regardless of context", "Static embeddings require GPUs to compute", "Static embeddings can't handle punctuation"], correct_index: 1, points: 2 },
          { question_text: "Transformers process sequences token-by-token in strict order, like RNNs.", options: ["True", "False"], correct_index: 1, explanation: "Transformers use self-attention to process all tokens in parallel.", points: 1 },
          { question_text: "\"Few-shot learning\" in the context of large language models means:", options: ["Training the model on a small dataset from scratch", "The model performs a new task from a few examples in the prompt, without weight updates", "Using only a few layers of the transformer", "Fine-tuning with a low learning rate"], correct_index: 1, points: 2 },
        ],
      },
    ],
  },
  {
    title: "Week VI: Other AI Techniques",
    description: "Beyond supervised deep learning: evolutionary computation, reinforcement learning, and multi-agent systems.",
    lessons: [
      {
        title: "Genetic Algorithms",
        duration_minutes: 20,
        content_body: `<p>Genetic algorithms search for good solutions by mimicking natural selection: maintain a population of candidate solutions, evaluate each with a fitness function, and produce the next generation by selecting the fittest candidates and combining them via crossover and random mutation. They're most useful for optimization problems where the search space is large, poorly understood, and not easily differentiable — where gradient-based methods don't apply.</p>`,
        resource: { title: "Genetic algorithms lesson", path: "lessons/6-Other/21-GeneticAlgorithms" },
      },
      {
        title: "Deep Reinforcement Learning",
        duration_minutes: 30,
        content_body: `<h3>Learning From Consequences, Not Labels</h3><p>Reinforcement learning trains an agent that takes actions in an environment and receives rewards or penalties, with no labeled "correct answer" for any given state — the agent must discover good behavior through trial and error, balancing exploration of unknown actions against exploitation of known-good ones.</p><h3>Deep RL</h3><p>Deep reinforcement learning uses a neural network to approximate the value of actions (or directly output a policy) when the state space is too large to represent as a lookup table — the approach behind results like superhuman Atari and Go play. This lesson covers the Q-learning framework and how it extends to deep Q-networks.</p>`,
        resource: { title: "Deep RL lesson & lab", path: "lessons/6-Other/22-DeepRL" },
      },
      {
        title: "Multi-Agent Systems",
        duration_minutes: 20,
        content_body: `<p>Many real-world problems involve multiple AI agents interacting — cooperating, competing, or both. Multi-agent systems study how independent agents coordinate to solve problems no single agent could solve alone, and how strategies emerge from repeated interaction. This connects directly to current work on LLM-based agent systems, where multiple specialized model instances collaborate on a task.</p>`,
        resource: { title: "Multi-agent systems lesson", path: "lessons/6-Other/23-MultiagentSystems" },
      },
      {
        title: "Module 6 Knowledge Check",
        duration_minutes: 10,
        quiz: [
          { question_text: "Genetic algorithms are best suited to problems where:", options: ["Gradients are easy to compute", "The search space is large, poorly understood, and not easily differentiable", "Labeled training data is abundant", "The problem has exactly one correct answer"], correct_index: 1, points: 2 },
          { question_text: "In reinforcement learning, the agent learns from labeled examples of correct actions.", options: ["True", "False"], correct_index: 1, explanation: "RL agents learn from reward/penalty signals through trial and error, not labeled examples.", points: 1 },
        ],
      },
    ],
  },
  {
    title: "Week VII: AI Ethics",
    description: "The responsibilities that come with deploying AI systems in the real world.",
    lessons: [
      {
        title: "AI Ethics and Responsible AI",
        duration_minutes: 25,
        content_body: `<h3>Why This Matters as Much as the Technical Content</h3><p>Every technique in this course — from a simple perceptron to a large language model — can cause real harm when deployed carelessly. This closing lesson covers the core pillars of responsible AI: <strong>fairness</strong> (does the system perform equally well across demographic groups, or does it encode bias from its training data?), <strong>transparency</strong> (can decisions be explained to the people affected by them?), <strong>privacy</strong> (what data does the system collect and retain, and with what consent?), and <strong>accountability</strong> (who is responsible when an AI-driven decision causes harm — always a human or organization, never the model itself).</p><h3>Where Bias Comes From</h3><p>AI bias isn't only a data problem. It can enter through skewed training data, through proxy variables that correlate with protected attributes, through the choice of what to optimize for, and through how a system is deployed and by whom it's used. Mitigating it requires attention at every stage of the pipeline, not just a fairness check at the end.</p>`,
        resource: { title: "AI Ethics lesson", path: "lessons/7-Ethics" },
      },
      {
        title: "Module 7 Knowledge Check",
        duration_minutes: 10,
        quiz: [
          { question_text: "AI bias can only originate from imbalanced training data.", options: ["True", "False"], correct_index: 1, explanation: "Bias can also enter through proxy variables, optimization choices, and deployment context.", points: 1 },
          { question_text: "In responsible AI, \"accountability\" means:", options: ["The AI model is held legally responsible for its outputs", "A human or organization remains responsible for AI-driven decisions", "Accountability only applies once a system reaches AGI", "Accountability is handled automatically by explainability tools"], correct_index: 1, points: 2 },
        ],
      },
    ],
  },
  {
    title: "Bonus: Multi-Modal AI",
    description: "A look beyond the core curriculum at models that combine vision and language.",
    lessons: [
      {
        title: "Multi-Modal Networks: CLIP and VQGAN",
        duration_minutes: 20,
        content_body: `<p>Most of this course treats vision and language as separate domains. Multi-modal models bridge them: CLIP learns a shared embedding space for images and text by training on millions of image-caption pairs, so it can match an image to the caption that best describes it (or vice versa) without task-specific fine-tuning. VQGAN, often paired with CLIP, generates images from text descriptions by optimizing an image to score well against a target caption in CLIP's shared space — an early technique in the lineage that led to today's text-to-image models.</p>`,
        resource: { title: "Multi-modal networks lesson", path: "lessons/X-Extras/X1-MultiModal" },
      },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding AI Foundations course…\n");

  const course = await prisma.course.upsert({
    where: { slug: "ai-foundations" },
    update: {},
    create: {
      slug: "ai-foundations",
      title: "AI Foundations",
      subtitle: "A 12-week, hands-on introduction to AI, machine learning, and deep learning",
      description: "From the history of AI through neural networks, computer vision, NLP, and responsible AI — a practical foundation for anyone starting out in the field.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 60,
      pdu_value: 40,
      total_lessons: 33,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A 12-week, hands-on introduction to AI, machine learning, and deep learning",
        description: "From the history of AI through neural networks, computer vision, NLP, and responsible AI — a practical foundation for anyone starting out in the field.",
        overview_headline: "What You'll Learn",
        overview_body: "AI Foundations takes you from first principles — what AI actually is and how the field got here — through the core techniques powering modern AI systems: neural networks, convolutional networks for vision, transformers and large language models for text, and the ethical considerations that come with deploying any of it. Each module pairs a written lesson with a hands-on notebook lab.",
        learning_outcomes: [
          "Explain the history of AI and the difference between symbolic and connectionist approaches",
          "Build and train neural networks from a single perceptron up through deep architectures",
          "Apply CNNs, transfer learning, and generative models (GANs, autoencoders) to computer vision tasks",
          "Apply embeddings, RNNs, and transformers to natural language processing tasks",
          "Use large language models effectively through prompt design",
          "Apply genetic algorithms and reinforcement learning to problems outside supervised learning",
          "Identify sources of AI bias and apply responsible AI principles to real deployments",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Start with AI's history and the symbolic-vs-connectionist divide, then build neural networks from scratch." },
          { title: "Step 2: Computer Vision", description: "Work through CNNs, transfer learning, generative models, detection, and segmentation." },
          { title: "Step 3: Natural Language Processing", description: "Progress from bag-of-words through embeddings, RNNs, transformers, and large language models." },
          { title: "Step 4: Beyond Supervised Learning", description: "Explore genetic algorithms, deep reinforcement learning, and multi-agent systems." },
          { title: "Step 5: Responsible AI", description: "Close with the fairness, transparency, and accountability principles every AI practitioner needs." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every module links to a runnable notebook lab so you practice each concept in code, not just theory.",
        training_exam_prep_items: ["Module knowledge-check quizzes", "Linked hands-on notebook labs", "PyTorch and TensorFlow examples", "Real datasets, not toy demos"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug}) — status: ${course.status}, listed: ${course.is_listed}`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) {
    console.log(`✓ Modules already exist for this course (skipped) — ${existingModules} found`);
    console.log("\n✅  Done.\n");
    return;
  }

  let moduleSortOrder = 1;
  for (const modDef of modules) {
    const mod = await prisma.module.create({
      data: {
        course_id: course.id,
        title: modDef.title,
        description: modDef.description,
        sort_order: moduleSortOrder++,
        is_published: true,
      },
    });

    let lessonSortOrder = 1;
    for (const lessonDef of modDef.lessons) {
      const isQuiz = !!lessonDef.quiz;
      const lesson = await prisma.lesson.create({
        data: {
          module_id: mod.id,
          title: lessonDef.title,
          type: isQuiz ? LessonType.quiz : LessonType.reading,
          sort_order: lessonSortOrder++,
          duration_minutes: lessonDef.duration_minutes,
          is_published: true,
          is_free_preview: !!lessonDef.is_free_preview,
          content_body: lessonDef.content_body,
          max_attempts: isQuiz ? 3 : undefined,
        },
      });

      if (lessonDef.resource) {
        await prisma.lessonResource.create({
          data: {
            lesson_id: lesson.id,
            title: lessonDef.resource.title,
            url: `${REPO}/${lessonDef.resource.path}`,
            file_type: "link",
          },
        });
      }

      if (lessonDef.quiz) {
        await prisma.quizQuestion.createMany({
          data: lessonDef.quiz.map((q, i) => ({
            lesson_id: lesson.id,
            question_text: q.question_text,
            question_type: q.options.length === 2 && q.options.includes("True") ? QuestionType.true_false : QuestionType.multiple_choice,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            points: q.points ?? 1,
            sort_order: i + 1,
          })),
        });
      }
    }

    console.log(`✓ Module: ${modDef.title} — ${modDef.lessons.length} lessons`);
  }

  console.log("\n✅  AI Foundations seeded: 9 modules, 33 lessons.\n");
  console.log("  Course is DRAFT and UNLISTED — review in the admin course builder,");
  console.log("  then publish (status: active, is_listed: true) when ready.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
