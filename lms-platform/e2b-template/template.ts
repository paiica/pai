import { Template } from "e2b";

// Extends E2B's public code-interpreter-v1 (Jupyter/code-interpreter server
// preinstalled) with the CPU-only ML stack the AI Foundations labs need.
// Each pipInstall is its own layer so a change to one doesn't invalidate the
// (large, slow) torch/tensorflow layers' build cache.
export const template = Template()
  .fromTemplate("code-interpreter-v1")
  .pipInstall(["numpy", "pandas", "matplotlib", "scikit-learn"])
  .runCmd("pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu")
  .pipInstall(["tensorflow-cpu"])
  .pipInstall(["opencv-python-headless"])
  .pipInstall(["gym"]);
