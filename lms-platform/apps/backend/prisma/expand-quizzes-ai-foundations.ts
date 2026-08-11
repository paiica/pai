/**
 * Expands the 7 module knowledge-check quizzes in "AI Foundations" from ~2-4
 * lightweight questions each to ~9-10, grounded in the real lesson content pulled
 * in by enrich-ai-foundations.ts (not the original source repo's quiz app, which
 * isn't portable — these are original questions written against the actual
 * README/notebook text now stored in each lesson).
 *
 * Run with: npx ts-node prisma/expand-quizzes-ai-foundations.ts
 * Safe to re-run — replaces (delete + recreate) quiz_questions for these 7 lessons.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, QuestionType } from "@prisma/client";

const prisma = new PrismaClient();

type Q = { question_text: string; options: string[]; correct_index: number; explanation?: string; points?: number };

const quizzes: { moduleTitle: string; lessonTitle: string; questions: Q[] }[] = [
  {
    moduleTitle: "Week I: Introduction to AI",
    lessonTitle: "Module 1 Knowledge Check",
    questions: [
      { question_text: "Who is credited with inventing an early computing device that followed algorithms — the historical starting point referenced for modern computing?", options: ["Charles Babbage", "Alan Turing", "Frank Rosenblatt", "John Holland"], correct_index: 0, points: 1 },
      { question_text: "\"Strong AI\" is also known as:", options: ["Narrow AI", "Artificial General Intelligence (AGI)", "Expert Systems", "Reinforcement Learning"], correct_index: 1, points: 1 },
      { question_text: "The Turing Test evaluates machine intelligence by:", options: ["Measuring processing speed", "Whether a human interrogator can distinguish the machine from a real human in text dialogue", "Counting the number of parameters in the model", "Testing performance on ImageNet"], correct_index: 1, points: 2 },
      { question_text: "The Eugene Goostman chatbot came close to \"passing\" the Turing Test in 2014 primarily by:", options: ["Demonstrating genuine language understanding", "Using a personality trick (posing as a 13-year-old non-native speaker) to explain its gaps", "Being trained on more data than any prior chatbot", "Using a neural network architecture"], correct_index: 1, points: 2 },
      { question_text: "The \"top-down\" approach to AI is also called:", options: ["Neural networks", "Symbolic reasoning", "Genetic algorithms", "Reinforcement learning"], correct_index: 1, points: 1 },
      { question_text: "The \"bottom-up\" approach to AI models:", options: ["Formal logical rules extracted from experts", "The structure of the human brain, built from simple units called neurons", "Evolutionary selection processes", "Multi-agent negotiation"], correct_index: 1, points: 1 },
      { question_text: "What led to the AI Winter of the 1970s?", options: ["A lack of computing hardware entirely", "Symbolic/expert-system approaches proved too complex and expensive to scale", "The invention of the transformer architecture", "Government bans on AI research"], correct_index: 1, points: 2 },
      { question_text: "In 2012, which type of network was first used for image classification, causing a dramatic drop in error rates on ImageNet?", options: ["Recurrent Neural Networks", "Convolutional Neural Networks", "Genetic Algorithms", "Expert Systems"], correct_index: 1, points: 2 },
      { question_text: "In 2015, ResNet (from Microsoft Research) achieved a notable milestone in image classification.", options: ["True", "False"], correct_index: 0, explanation: "ResNet achieved human-level accuracy on ImageNet classification in 2015.", points: 1 },
      { question_text: "Which of these is one of the additional AI approaches mentioned beyond top-down and bottom-up?", options: ["Evolutionary / genetic algorithm approach", "Quantum computing approach", "Blockchain-based approach", "Federated learning approach"], correct_index: 0, points: 1 },
    ],
  },
  {
    moduleTitle: "Week II: Symbolic AI",
    lessonTitle: "Module 2 Knowledge Check",
    questions: [
      { question_text: "In the DIKW pyramid, what turns \"information\" into \"knowledge\"?", options: ["Storing it in a database", "Integrating it into our active model of the world", "Translating it into another language", "Compressing it"], correct_index: 1, points: 2 },
      { question_text: "Representing facts as Object-Attribute-Value triplets (e.g. Python — invented-by — Guido van Rossum) is an example of:", options: ["A semantic network", "A production rule", "A neural network layer", "A convolutional filter"], correct_index: 0, points: 1 },
      { question_text: "In frame representation, the properties of an object or class are stored in:", options: ["Nodes", "Slots", "Weights", "Gradients"], correct_index: 1, points: 1 },
      { question_text: "Production rules follow which structure?", options: ["If-then statements", "Key-value pairs only", "Gradient descent updates", "Convolution operations"], correct_index: 0, points: 1 },
      { question_text: "In an expert system's architecture, which component holds long-term domain knowledge extracted from human experts and does not change between consultations?", options: ["Problem memory", "Knowledge base", "Inference engine", "Working memory only"], correct_index: 1, points: 2 },
      { question_text: "Forward inference starts with a goal and works backward, asking questions only when needed.", options: ["True", "False"], correct_index: 1, explanation: "That describes backward inference. Forward inference starts from known facts in working memory and applies rules until a conclusion is reached.", points: 1 },
      { question_text: "Backward inference is especially useful in scenarios like medical diagnosis because:", options: ["It requires running every possible test upfront", "It only asks for the specific information needed to prove or disprove a hypothesis", "It never needs a knowledge base", "It is always faster than forward inference"], correct_index: 1, points: 2 },
      { question_text: "The Semantic Web's core concept for formally specifying a problem domain is called a(n):", options: ["Ontology", "Algorithm", "Perceptron", "Embedding"], correct_index: 0, points: 1 },
      { question_text: "In the Family Ontology exercise, genealogical trees were represented using which file format?", options: ["JSON", "GEDCOM", "CSV", "YAML"], correct_index: 1, points: 1 },
      { question_text: "WikiData and DBpedia are examples of large-scale, machine-readable knowledge bases built around real-world ontologies.", options: ["True", "False"], correct_index: 0, points: 1 },
    ],
  },
  {
    moduleTitle: "Week III: Neural Network Foundations",
    lessonTitle: "Module 3 Knowledge Check",
    questions: [
      { question_text: "Who built the original hardware perceptron (\"Mark-1\") in 1957?", options: ["Frank Rosenblatt", "Alan Turing", "Geoffrey Hinton", "John Holland"], correct_index: 0, points: 1 },
      { question_text: "A single perceptron can correctly learn the XOR function.", options: ["True", "False"], correct_index: 1, explanation: "XOR is not linearly separable, so a single-layer perceptron cannot learn it.", points: 1 },
      { question_text: "Who published the influential 1969 analysis demonstrating this limitation of perceptrons?", options: ["Minsky and Papert", "LeCun and Bengio", "Rosenblatt and Hinton", "Goodfellow and Courville"], correct_index: 0, points: 2 },
      { question_text: "In gradient descent, the \"learning rate\" primarily controls:", options: ["The number of layers in the network", "How much the weights are adjusted at each training step", "The size of the training dataset", "The activation function used"], correct_index: 1, points: 1 },
      { question_text: "The MNIST dataset used in these lessons consists of:", options: ["Color photographs of animals", "28x28 grayscale images of handwritten digits", "Text news articles", "Audio recordings"], correct_index: 1, points: 1 },
      { question_text: "In a multi-layer perceptron, what must be placed between linear layers for the network to be more expressive than a single linear layer?", options: ["A non-linear activation function", "A second loss function", "An extra bias term only", "A larger learning rate"], correct_index: 0, points: 2 },
      { question_text: "The algorithm used to propagate error backward through a multi-layer network to compute gradients is called:", options: ["Forward propagation", "Backpropagation", "Cross-validation", "Tokenization"], correct_index: 1, points: 1 },
      { question_text: "The softmax function is used to:", options: ["Remove outliers from training data", "Convert raw network outputs into a probability distribution over classes", "Speed up matrix multiplication", "Initialize network weights"], correct_index: 1, points: 2 },
      { question_text: "A low training error combined with a high or rising validation error is a classic sign of:", options: ["Underfitting", "Overfitting", "Vanishing gradients", "A learning rate that's too low"], correct_index: 1, points: 1 },
      { question_text: "Which of the following is NOT a recommended way to reduce overfitting?", options: ["Increasing the amount of training data", "Simplifying the model", "Using regularization such as dropout", "Increasing the model's number of parameters"], correct_index: 3, points: 1 },
    ],
  },
  {
    moduleTitle: "Week IV: Computer Vision",
    lessonTitle: "Module 4 Knowledge Check",
    questions: [
      { question_text: "OpenCV traditionally loads color images using which channel order?", options: ["RGB (Red-Green-Blue)", "BGR (Blue-Green-Red)", "CMYK", "HSV only"], correct_index: 1, points: 1 },
      { question_text: "Convolutional filters in a CNN are always designed manually by engineers and never learned automatically.", options: ["True", "False"], correct_index: 1, explanation: "One of the core ideas behind CNNs is that filters are trained automatically from data.", points: 1 },
      { question_text: "The \"pyramid architecture\" common in CNNs refers to:", options: ["Spatial dimensions decreasing while the number of filters increases with depth", "Stacking identical layers with no change in size", "Using only one convolutional layer", "Increasing image resolution at each layer"], correct_index: 0, points: 2 },
      { question_text: "Which CNN architecture achieved 92.7% top-5 accuracy on ImageNet in 2014 using stacked small (3x3) convolutional filters?", options: ["AlexNet", "VGG-16", "LeNet", "ResNet-18"], correct_index: 1, points: 2 },
      { question_text: "Transfer learning works by:", options: ["Training a brand-new network from random weights every time", "Reusing a network pre-trained on a large dataset (e.g. ImageNet) as a feature extractor or fine-tuning it for a new task", "Only applying to text data", "Avoiding the use of any pre-trained weights"], correct_index: 1, points: 2 },
      { question_text: "When fine-tuning a pre-trained network, it's recommended to first freeze the convolutional feature-extractor layers before unfreezing them.", options: ["True", "False"], correct_index: 0, explanation: "Freezing first stabilizes the new classifier layer before allowing gradients to flow into (and potentially destroy) the pre-trained weights.", points: 1 },
      { question_text: "Autoencoders are trained using:", options: ["Labeled data only", "Unlabeled data, learning to reconstruct their own input (self-supervised learning)", "Reinforcement signals", "Adversarial competition between two networks"], correct_index: 1, points: 1 },
      { question_text: "What does a Variational Autoencoder (VAE) add on top of a standard autoencoder?", options: ["A discriminator network", "A smooth, probabilistic latent distribution instead of arbitrary latent vectors", "A convolutional filter bank", "A bag-of-words input layer"], correct_index: 1, points: 2 },
      { question_text: "In a GAN, which two networks are trained against each other?", options: ["Encoder and decoder", "Generator and discriminator", "Actor and critic", "Forward and backward passes"], correct_index: 1, points: 1 },
      { question_text: "What is the key difference between object detection and semantic segmentation?", options: ["Detection draws bounding boxes around objects; segmentation classifies every pixel", "They are the same task with different names", "Detection only works on video, segmentation only on images", "Segmentation cannot use CNNs"], correct_index: 0, points: 2 },
    ],
  },
  {
    moduleTitle: "Week V: Natural Language Processing",
    lessonTitle: "Module 5 Knowledge Check",
    questions: [
      { question_text: "What information does a Bag-of-Words representation discard?", options: ["Word frequency", "Word order", "Vocabulary size", "Character encoding"], correct_index: 1, points: 1 },
      { question_text: "TF-IDF improves on simple word counts by:", options: ["Ignoring rare words entirely", "Down-weighting words that appear frequently across the whole document collection", "Only counting nouns", "Using character-level tokens instead of words"], correct_index: 1, points: 2 },
      { question_text: "Word2Vec's Continuous Bag-of-Words (CBoW) architecture is trained to predict:", options: ["The next sentence in a document", "The middle/target word given its surrounding context words", "The sentiment of a document", "The part of speech of a word"], correct_index: 1, points: 2 },
      { question_text: "Skip-gram is generally faster to train than CBoW.", options: ["True", "False"], correct_index: 1, explanation: "CBoW is faster; skip-gram is slower but does a better job representing infrequent words.", points: 1 },
      { question_text: "The famous \"king - man + woman ≈ queen\" example demonstrates that:", options: ["Word embeddings are always exactly accurate", "Word embeddings capture semantic relationships as vector arithmetic", "TF-IDF can perform arithmetic on words", "Bag-of-words preserves word order"], correct_index: 1, points: 2 },
      { question_text: "What problem does an LSTM's gating mechanism primarily address, compared to a classical RNN?", options: ["Overfitting on small datasets", "The vanishing gradient problem that limits learning of long-range dependencies", "Slow inference speed", "Lack of GPU support"], correct_index: 1, points: 2 },
      { question_text: "In an LSTM cell, the \"forget gate\" is responsible for:", options: ["Generating the next word in a sequence", "Deciding which components of the cell state to discard", "Initializing the embedding layer", "Computing the loss function"], correct_index: 1, points: 1 },
      { question_text: "Transformers process sequences by replacing recurrence with which mechanism, allowing parallel processing of all tokens?", options: ["Self-attention", "Convolution", "Pooling", "Backpropagation"], correct_index: 0, points: 1 },
      { question_text: "BERT produces the same embedding for a word regardless of the surrounding sentence context.", options: ["True", "False"], correct_index: 1, explanation: "Unlike static embeddings (Word2Vec/GloVe), BERT produces contextual embeddings that vary with surrounding text.", points: 1 },
      { question_text: "Named Entity Recognition (NER) is the task of:", options: ["Translating text between languages", "Identifying and classifying spans of text into categories like person, organization, or location", "Compressing text into a bag-of-words vector", "Predicting the next character in a sequence"], correct_index: 1, points: 1 },
    ],
  },
  {
    moduleTitle: "Week VI: Other AI Techniques",
    lessonTitle: "Module 6 Knowledge Check",
    questions: [
      { question_text: "Who proposed Genetic Algorithms in 1975?", options: ["John Henry Holland", "Alan Turing", "Richard Sutton", "Marvin Minsky"], correct_index: 0, points: 1 },
      { question_text: "In a Genetic Algorithm, which operation combines two existing solutions to produce a new valid solution?", options: ["Mutation", "Crossover", "Selection only", "Backpropagation"], correct_index: 1, points: 1 },
      { question_text: "In Genetic Algorithms, mutation exists purely to speed up convergence and serves no other purpose.", options: ["True", "False"], correct_index: 1, explanation: "Mutation also helps destabilize the optimization to escape local minima.", points: 1 },
      { question_text: "In Reinforcement Learning, what signal indicates how successful an agent's actions were?", options: ["The loss function", "The reward function", "The learning rate", "The embedding vector"], correct_index: 1, points: 1 },
      { question_text: "The tension between using known good actions versus trying new ones in RL is called:", options: ["Bias-variance tradeoff", "Exploration vs. exploitation", "Overfitting vs. underfitting", "Forward vs. backward inference"], correct_index: 1, points: 2 },
      { question_text: "In the Actor-Critic reinforcement learning architecture, what does the \"critic\" do?", options: ["Selects which action to take", "Estimates the expected total future reward from a given state", "Generates synthetic training data", "Tokenizes the input text"], correct_index: 1, points: 2 },
      { question_text: "The three simple rules governing flocking behavior in multi-agent simulations are alignment, cohesion, and:", options: ["Separation", "Mutation", "Backpropagation", "Regularization"], correct_index: 0, points: 1 },
      { question_text: "Reactive agents use complex logical reasoning and planning before acting.", options: ["True", "False"], correct_index: 1, explanation: "That describes deliberative agents. Reactive agents have simple request-response behavior.", points: 1 },
      { question_text: "The Belief-Desire-Intention (BDI) model is an architecture used for:", options: ["Convolutional neural networks", "Deliberative agents", "Word embeddings", "Genetic algorithm fitness functions"], correct_index: 1, points: 1 },
    ],
  },
  {
    moduleTitle: "Week VII: AI Ethics",
    lessonTitle: "Module 7 Knowledge Check",
    questions: [
      { question_text: "Which of these is NOT one of Microsoft's six Principles of Responsible AI?", options: ["Fairness", "Transparency", "Profitability", "Accountability"], correct_index: 2, points: 1 },
      { question_text: "\"Fairness\" in Responsible AI primarily addresses:", options: ["Model biases caused by imbalanced or biased training data", "How fast a model runs", "How much a model costs to train", "The number of parameters in a model"], correct_index: 0, points: 2 },
      { question_text: "Because training data becomes integrated into a model's weights, privacy considerations include remembering what data a model was trained on.", options: ["True", "False"], correct_index: 0, points: 1 },
      { question_text: "\"Inclusiveness\" as a Responsible AI principle means:", options: ["Replacing human workers entirely with AI", "Augmenting people and ensuring underrepresented communities are fairly represented and handled", "Making AI systems open-source", "Maximizing model accuracy above all else"], correct_index: 1, points: 2 },
      { question_text: "Which principle emphasizes that people should always know when AI is being used, and that systems should be interpretable where possible?", options: ["Transparency", "Reliability and Safety", "Privacy and Security", "Inclusiveness"], correct_index: 0, points: 1 },
      { question_text: "\"Accountability\" in Responsible AI is primarily about:", options: ["Ensuring humans remain responsible for decisions made with AI assistance", "Making AI models legally liable for their outputs", "Removing humans from decision-making entirely", "Tracking model training costs"], correct_index: 0, points: 2 },
      { question_text: "Which tool in Microsoft's Responsible AI Toolbox focuses specifically on model fairness?", options: ["InterpretML", "FairLearn (Fairness Dashboard)", "EconML", "DiCE"], correct_index: 1, points: 1 },
      { question_text: "\"Reliability and Safety\" acknowledges that AI models return probabilities rather than certainties, and mistakes are possible.", options: ["True", "False"], correct_index: 0, points: 1 },
      { question_text: "DiCE, part of the Responsible AI Toolbox, is used for:", options: ["Training larger models faster", "Counterfactual analysis — showing which features would need to change to alter a model's decision", "Visualizing convolutional filters", "Tokenizing text for NLP models"], correct_index: 1, points: 2 },
    ],
  },
];

async function main() {
  console.log("🌱  Expanding AI Foundations module quizzes…\n");

  const course = await prisma.course.findUnique({ where: { slug: "ai-foundations" } });
  if (!course) throw new Error("Run seed-ai-foundations.ts first");

  let totalQuestions = 0;

  for (const quiz of quizzes) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: quiz.lessonTitle, module: { course_id: course.id, title: quiz.moduleTitle } },
    });
    if (!lesson) {
      console.warn(`⚠ Quiz lesson not found: ${quiz.moduleTitle} / ${quiz.lessonTitle}`);
      continue;
    }

    await prisma.quizQuestion.deleteMany({ where: { lesson_id: lesson.id } });
    await prisma.quizQuestion.createMany({
      data: quiz.questions.map((q, i) => ({
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

    console.log(`✓ ${quiz.lessonTitle}  (${quiz.questions.length} questions)`);
    totalQuestions += quiz.questions.length;
  }

  console.log(`\n✅  Expanded quizzes: ${totalQuestions} total questions across ${quizzes.length} modules.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
