# ⚠️ AI DEVELOPMENT WARNING ⚠️

**CRITICAL INSTRUCTION FOR ALL FUTURE AI AGENTS:**

DO NOT EDIT ANY FILES INSIDE THE `CtblPlusPlus.WebUI\web\Bundled` DIRECTORY. 
DO NOT EDIT FILES IN THE `Program Files` DIRECTORY EITHER.

The `Bundled` directory is **auto-generated** by Webpack. If you make changes directly to any `.js`, `.html`, or `.css` files inside the `Bundled` directory, your work **WILL BE OVERWRITTEN AND LOST** the next time the project is built.

## The Correct Workflow:
1. Make all your UI modifications (HTML, CSS, JS) inside the `CtblPlusPlus.WebUI\web\Raw` directory.
2. Run `Deploy.ps1`. This script has been updated to automatically run `npm run build` to compile your `Raw` changes into the `Bundled` directory, and then it will deploy the results to the Cold Turkey installation directory.

If you edit the `Raw` files, your progress will be permanently saved and properly bundled. If you edit the `Bundled` files, you will lose your work.
