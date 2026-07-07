<p align="center"> <img src="assets/banner.svg" alt="CTBL++ - Cold Turkey Blocker, extended" width="100%"> </p> <p align="center"> <b>A community-built add-on for <a href="https://getcoldturkey.com/">Cold Turkey Blocker</a> that adds features the official app doesn't have.</b> </p> <p align="center">
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

Thanks for considering contributing. Developers, vibe coders, and people with ideas are all welcome; feedback and feature requests help just as much as code.

## Source Access

CTBL++ is MIT-licensed and split across two repos:

- **Public repo** — everything except the sensitive enforcement internals.
- **Private repo** — watchdogs, vault sealing, and HMAC signing. Authorized contributors get access to this separately.

Public clones build and run without the private repo for most work. Changes touching watchdogs, the vault, or HMAC signing require private repo access before you can build or test locally.

Access is managed through a single GitHub issue: **[Source Access Requests](https://github.com/Detractless/CtblPlusPlus/issues/9)**

### How it works

The Action has two triggers. It fires immediately on any matching comment to acknowledge, cancel, or revoke. The only thing it waits on is the 7-day grant, which a scheduled scan checks every 2 hours. Every request, grant, and cancellation is logged in the thread with a timestamp. No DMs, no manual steps.

### Comment reference

Post in the pinned access issue. The Action verifies that the GitHub account posting the comment matches the username in the text.

| Scenario | You comment | Action replies | Timing |
|---|---|---|---|
| You don't have full access and want it | `[Username]::Request Full Access` | `[Username]::Countdown Started - Access scheduled for [Date]` | Immediate |
| You requested full access but want to cancel before it's granted | `[Username]::Forget Full Access` | `[Username]::Countdown Cancelled` | Immediate |
| You have full access but no longer want it | `[Username]::Forget Full Access` | `[Username]::Access Revoked` | Immediate |
| You're granted full access after the 7-day wait | Nothing, it's automatic. | `[Username]::Access Granted [Date]` | Next scan |

### Notes

- The 7-day window exists because many people use CTBL++ to work through habits they're actively trying to break. Keeping enforcement internals slightly out of immediate reach is intentional.
- The Action validates identity server-side. It won't act on a comment where the GitHub login doesn't match the username in the text.
- If the Action doesn't respond within a few hours, open a separate issue.

## Setup

Requires Windows, .NET 10 SDK, Node.js, Cold Turkey Blocker (paid), and an Admin terminal.

```bash
git clone https://github.com/Detractless/CtblPlusPlus.git
cd CtblPlusPlus
ctbl.bat
```

### Adding private source (authorized contributors only)

Once you have access to the private repo, clone it separately and place the folder named `Place_Me_In_Root_of_CtblPlusPlus-Main` inside the root of your `CtblPlusPlus` clone. Then open `ctbl.bat` and run:

```
[5] Split / Combine → [2] Combine
```

This copies the private source files into the right locations in the project tree. After that, run `[1] Build` as normal.

See the [README](README.md) for full build details.

## Before You Start

- Bug fixes and security hardening are always welcome.
- For new features, open an issue first so we can align on scope.
- Changes touching watchdogs, the vault, or HMAC signing require private repo access before you can build or test locally.

## Security

This is a tamper-resistance tool, so security matters more than usual.

- Don't introduce bypass vectors. If a change makes enforcement easier to circumvent, it won't be merged.
- Found a bypass? Report it as an issue. If it's sensitive, say so and we'll prioritize it.

## Pull Requests

- One logical change per PR.
- Build and test manually before submitting (`ctbl.bat`).
- Explain what changed and how to test it. Flag anything touching watchdogs, the vault, or HMAC signing.

## AI Agent Skills

This project is developed with AI-assisted workflows. Skill files live in `.agents/*.md`; take a look at a relevant skill before using an agent to contribute.

## License

Contributions are licensed under the [MIT License](LICENSE).
