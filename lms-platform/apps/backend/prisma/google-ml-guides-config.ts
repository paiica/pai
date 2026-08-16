/**
 * Config for the 6 flat-nav Google ML education hub guides (no
 * devsite-nav-expandable grouping at all — see parseDevsiteFlatPages in
 * google-devsite-lib.ts). Page hrefs were hand-gathered from each
 * course's live nav (in document order) since there's no automatic
 * "unit" grouping to derive lesson boundaries from; grouping below is a
 * manual editorial call (e.g. clustering's 4 k-means sub-pages joined
 * into one lesson) rather than mechanically 1:1 with source pages.
 * Each course becomes ONE module containing the listed lessons, with
 * each lesson's hrefs joined into one document.
 */
import { CourseLevel } from "@prisma/client";

export interface GuideLessonDef { title: string; hrefs: string[] }
export interface GuideCourseDef {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  level: CourseLevel;
  duration_hours: number;
  pdu_value: number;
  moduleTitle: string;
  anchorPath: string; // path (no domain) used to fetch nav source HTML
  pathPrefix: string; // for reference only, matches anchorPath's course root
  lessons: GuideLessonDef[];
  overview_headline: string;
  overview_body: string;
  learning_outcomes: string[];
}

const BASE = "https://developers.google.com";

export const GUIDE_COURSES: GuideCourseDef[] = [
  {
    slug: "clustering-ml",
    title: "Clustering",
    subtitle: "Google's official course on unsupervised clustering algorithms",
    description: "Learn how clustering algorithms group similar examples, how to prepare data for clustering, how k-means clustering works, and how deep neural networks improve similarity measures for clustering.",
    price: 149.0,
    level: CourseLevel.intermediate,
    duration_hours: 3,
    pdu_value: 2,
    moduleTitle: "Clustering",
    anchorPath: "/machine-learning/clustering/overview",
    pathPrefix: "/machine-learning/clustering",
    lessons: [
      { title: "Introduction to Clustering", hrefs: ["/machine-learning/clustering", "/machine-learning/clustering/overview"] },
      { title: "Clustering Algorithms", hrefs: ["/machine-learning/clustering/clustering-algorithms"] },
      { title: "Clustering Workflow", hrefs: ["/machine-learning/clustering/workflow"] },
      { title: "Preparing Data for Clustering", hrefs: ["/machine-learning/clustering/prepare-data"] },
      { title: "k-Means Clustering", hrefs: ["/machine-learning/clustering/kmeans/overview", "/machine-learning/clustering/kmeans/manual-similarity", "/machine-learning/clustering/kmeans/evaluate-results", "/machine-learning/clustering/kmeans/advantages-disadvantages"] },
      { title: "Clustering with Deep Neural Networks", hrefs: ["/machine-learning/clustering/dnn-clustering/overview", "/machine-learning/clustering/dnn-clustering/supervised-similarity", "/machine-learning/clustering/dnn-clustering/check-your-understanding"] },
      { title: "Clustering Review", hrefs: ["/machine-learning/clustering/summary"] },
    ],
    overview_headline: "What You'll Learn",
    overview_body: "Clustering covers unsupervised clustering algorithms and workflow, data preparation, k-means clustering, and clustering with deep neural networks and embeddings.",
    learning_outcomes: [
      "Understand what clustering is and when to use it",
      "Prepare data for clustering algorithms",
      "Apply k-means clustering and evaluate its results",
      "Use deep neural networks and embeddings to measure similarity for clustering",
    ],
  },
  {
    slug: "generative-adversarial-networks",
    title: "Generative Adversarial Networks",
    subtitle: "Google's official course on GANs — generator, discriminator, and training",
    description: "Learn the structure of generative adversarial networks, how the generator and discriminator are trained together, common GAN training problems, and major GAN variations.",
    price: 149.0,
    level: CourseLevel.intermediate,
    duration_hours: 3,
    pdu_value: 2,
    moduleTitle: "Generative Adversarial Networks",
    anchorPath: "/machine-learning/gan/generative",
    pathPrefix: "/machine-learning/gan",
    lessons: [
      { title: "Introduction to GANs", hrefs: ["/machine-learning/gan", "/machine-learning/gan/generative"] },
      { title: "Overview of GAN Structure", hrefs: ["/machine-learning/gan/gan_structure"] },
      { title: "The Discriminator", hrefs: ["/machine-learning/gan/discriminator"] },
      { title: "The Generator", hrefs: ["/machine-learning/gan/generator"] },
      { title: "GAN Training and Loss Functions", hrefs: ["/machine-learning/gan/training", "/machine-learning/gan/loss", "/machine-learning/gan/check"] },
      { title: "Common Problems", hrefs: ["/machine-learning/gan/problems"] },
      { title: "GAN Variations", hrefs: ["/machine-learning/gan/applications"] },
      { title: "Summary and Next Steps", hrefs: ["/machine-learning/gan/summary"] },
    ],
    overview_headline: "What You'll Learn",
    overview_body: "Generative Adversarial Networks covers GAN structure, the discriminator and generator, training dynamics and loss functions, common training problems, and major GAN variations.",
    learning_outcomes: [
      "Understand the structure of a generative adversarial network",
      "Understand how the discriminator and generator are trained together",
      "Recognize and address common GAN training problems",
      "Understand major GAN variations and their applications",
    ],
  },
  {
    slug: "ml-problem-framing",
    title: "Introduction to ML Problem Framing",
    subtitle: "Google's official course on framing a problem as a machine learning problem",
    description: "Learn how to determine whether machine learning is the right approach for a problem, how to frame an ML problem clearly, and what's involved in implementing a model.",
    price: 99.0,
    level: CourseLevel.beginner,
    duration_hours: 2,
    pdu_value: 1,
    moduleTitle: "Problem Framing",
    anchorPath: "/machine-learning/problem-framing/problem-framing",
    pathPrefix: "/machine-learning/problem-framing",
    lessons: [
      { title: "Introduction", hrefs: ["/machine-learning/problem-framing"] },
      { title: "Problem Framing", hrefs: ["/machine-learning/problem-framing/problem-framing"] },
      { title: "Understand the Problem", hrefs: ["/machine-learning/problem-framing/problem"] },
      { title: "Framing an ML Problem", hrefs: ["/machine-learning/problem-framing/ml-framing"] },
      { title: "Implementing a Model", hrefs: ["/machine-learning/problem-framing/implement-model"] },
    ],
    overview_headline: "What You'll Learn",
    overview_body: "Introduction to ML Problem Framing covers how to decide whether ML is the right approach, how to understand and frame a problem clearly, and what implementing a model involves.",
    learning_outcomes: [
      "Determine whether machine learning is a good approach for a problem",
      "Understand a problem before framing it as an ML task",
      "Frame a problem clearly as an ML problem",
      "Understand what's involved in implementing a model",
    ],
  },
  {
    slug: "managing-ml-projects",
    title: "Managing ML Projects",
    subtitle: "Google's official course on planning, running, and shipping ML projects",
    description: "Learn the development phases of ML projects, how to assemble a team, work with stakeholders, assess feasibility, plan experiments, measure success, build pipelines, productionize models, and apply AI and ML ethics.",
    price: 149.0,
    level: CourseLevel.intermediate,
    duration_hours: 3,
    pdu_value: 2,
    moduleTitle: "Managing ML Projects",
    anchorPath: "/machine-learning/managing-ml-projects/phases",
    pathPrefix: "/machine-learning/managing-ml-projects",
    lessons: [
      { title: "Overview", hrefs: ["/machine-learning/managing-ml-projects"] },
      { title: "Development Phases", hrefs: ["/machine-learning/managing-ml-projects/phases"] },
      { title: "Assembling a Team", hrefs: ["/machine-learning/managing-ml-projects/team"] },
      { title: "Working with Stakeholders", hrefs: ["/machine-learning/managing-ml-projects/stakeholders"] },
      { title: "Feasibility", hrefs: ["/machine-learning/managing-ml-projects/feasibility"] },
      { title: "Planning", hrefs: ["/machine-learning/managing-ml-projects/planning"] },
      { title: "Measuring Success", hrefs: ["/machine-learning/managing-ml-projects/success"] },
      { title: "Experiments", hrefs: ["/machine-learning/managing-ml-projects/experiments"] },
      { title: "ML Pipelines", hrefs: ["/machine-learning/managing-ml-projects/pipelines"] },
      { title: "Productionization", hrefs: ["/machine-learning/managing-ml-projects/production"] },
      { title: "AI and ML Ethics", hrefs: ["/machine-learning/managing-ml-projects/ethics"] },
      { title: "ML Resources", hrefs: ["/machine-learning/managing-ml-projects/resources"] },
    ],
    overview_headline: "What You'll Learn",
    overview_body: "Managing ML Projects covers the development phases of an ML project, assembling a team, working with stakeholders, feasibility and planning, measuring success, experiments, pipelines, productionization, and AI/ML ethics.",
    learning_outcomes: [
      "Understand the development phases of an ML project",
      "Assemble a team and work effectively with stakeholders",
      "Assess feasibility and plan an ML project",
      "Measure success and run experiments",
      "Build ML pipelines and productionize models",
      "Apply AI and ML ethics throughout a project",
    ],
  },
  {
    slug: "intro-to-machine-learning",
    title: "Introduction to Machine Learning",
    subtitle: "Google's official primer on what machine learning is and how supervised learning works",
    description: "A short primer on what machine learning is, the core concepts of supervised learning, and how to check your understanding of the fundamentals.",
    price: 49.0,
    level: CourseLevel.beginner,
    duration_hours: 1,
    pdu_value: 1,
    moduleTitle: "Introduction to Machine Learning",
    anchorPath: "/machine-learning/intro-to-ml/what-is-ml",
    pathPrefix: "/machine-learning/intro-to-ml",
    lessons: [
      { title: "Introduction to Machine Learning", hrefs: ["/machine-learning/intro-to-ml"] },
      { title: "What Is Machine Learning?", hrefs: ["/machine-learning/intro-to-ml/what-is-ml"] },
      { title: "Supervised Learning", hrefs: ["/machine-learning/intro-to-ml/supervised"] },
      { title: "Test Your Understanding", hrefs: ["/machine-learning/intro-to-ml/understanding"] },
    ],
    overview_headline: "What You'll Learn",
    overview_body: "Introduction to Machine Learning is a short primer covering what machine learning is and the core concepts of supervised learning.",
    learning_outcomes: [
      "Understand what machine learning is",
      "Understand the core concepts of supervised learning",
    ],
  },
  {
    slug: "text-classification-guide",
    title: "Text Classification",
    subtitle: "Google's official step-by-step guide to building a text classification model",
    description: "A step-by-step guide to text classification: gathering and exploring data, choosing a model, preparing data, building and training a model, tuning hyperparameters, and deploying the model.",
    price: 149.0,
    level: CourseLevel.intermediate,
    duration_hours: 3,
    pdu_value: 2,
    moduleTitle: "Text Classification",
    anchorPath: "/machine-learning/guides/text-classification/step-1",
    pathPrefix: "/machine-learning/guides/text-classification",
    lessons: [
      { title: "Introduction", hrefs: ["/machine-learning/guides/text-classification"] },
      { title: "Step 1: Gather Data", hrefs: ["/machine-learning/guides/text-classification/step-1"] },
      { title: "Step 2: Explore Your Data", hrefs: ["/machine-learning/guides/text-classification/step-2"] },
      { title: "Step 2.5: Choose a Model", hrefs: ["/machine-learning/guides/text-classification/step-2-5"] },
      { title: "Step 3: Prepare Your Data", hrefs: ["/machine-learning/guides/text-classification/step-3"] },
      { title: "Step 4: Build, Train, and Evaluate Your Model", hrefs: ["/machine-learning/guides/text-classification/step-4"] },
      { title: "Step 5: Tune Hyperparameters", hrefs: ["/machine-learning/guides/text-classification/step-5"] },
      { title: "Step 6: Deploy Your Model", hrefs: ["/machine-learning/guides/text-classification/step-6"] },
      { title: "Conclusion", hrefs: ["/machine-learning/guides/text-classification/conclusion"] },
      { title: "Appendix: Batch Training", hrefs: ["/machine-learning/guides/text-classification/appendix"] },
    ],
    overview_headline: "What You'll Learn",
    overview_body: "Text Classification is a step-by-step guide covering data gathering and exploration, model selection, data preparation, building and training a model, hyperparameter tuning, and deployment.",
    learning_outcomes: [
      "Gather and explore a text classification dataset",
      "Choose the right model for a text classification task",
      "Prepare data and build, train, and evaluate a model",
      "Tune hyperparameters and deploy a text classification model",
    ],
  },
];

export { BASE };
