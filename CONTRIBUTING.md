<p align="center"> <img src="assets/banner.svg" alt="CTBL++ — Cold Turkey Blocker, extended" width="100%"> </p> <p align="center"> <b>A community-built add-on for <a href="https://getcoldturkey.com/">Cold Turkey Blocker</a> that adds features the official app doesn't have.</b> </p> <p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10">
  <img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/status-beta-8B5CF6?style=for-the-badge" alt="Status: beta">
  <img src="https://img.shields.io/badge/requires-Cold%20Turkey%20Pro-DC2626?style=for-the-badge" alt="Requires Cold Turkey Pro">
  <img src="https://img.shields.io/badge/license-MIT-22C55E?style=for-the-badge" alt="License: MIT">
  <img src="https://img.shields.io/badge/stars-2-eac54f?style=for-the-badge&logo=github&logoColor=white" alt="Stars">
</p>

## Contributing

Thanks for considering contributing! Developers, vibe coders, and people with ideas are all welcome; feedback and feature requests help just as much as code.

## Source Access (working on getting this hidden but functional)

CTBL++ is MIT-licensed, but full source access has a 7-day delay. This isn't about gatekeeping: many people use this tool to work through habits they're actively trying to break, and publishing every enforcement detail the moment it's written would undercut that. The delay keeps the most sensitive internals out of easy reach while still giving every contributor full access in time.

The repo, architecture, and most code are open. Sensitive enforcement internals (watchdogs, vault sealing) ship as encrypted archives for this reason.

To request access: open an issue with the **Source Access Request** template and your preferred contact method. After 7 days, a reviewer sends the password privately.

## Setup

Requires Windows, .NET 10 SDK, Node.js, Cold Turkey Blocker (paid), and an Admin terminal.

```bash
git clone https://github.com/Detractless/CtblPlusPlus.git
cd CtblPlusPlus
ctbl.bat
```

See the [README](README.md) for full build details.

## Before You Start

- Bug fixes and security hardening are always welcome.
- For new features, open an issue first so we can align on scope.

## Security

This is a tamper-resistance tool, so security matters more than usual:

- Don't introduce bypass vectors: if a change makes enforcement easier to circumvent, it won't be merged.
- Found a bypass? Report it as an issue. If it's sensitive, say so and we'll prioritize it.

## Pull Requests

- One logical change per PR.
- Build and test manually before submitting (`ctbl.bat`).
- Explain what changed and how to test it. Flag anything touching watchdogs, the vault, or HMAC signing.
- Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `fix(engine): ...`, `feat(ui): ...`).

## AI Agent Skills

This project is developed with AI-assisted workflows. Skill files live in `.agents/*.md`; load the relevant one before using an agent to contribute.

## License

Contributions are licensed under the [MIT License](LICENSE).
