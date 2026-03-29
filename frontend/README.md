# AI Money Mentor Frontend

This frontend delivers the complete user experience for AI Money Mentor, including onboarding, financial planners, portfolio views, and AI chat.

It is designed to make complex personal finance decisions feel simple through guided workflows, strong visual hierarchy, and actionable outputs.

## Frontend Scope

- Authentication and account onboarding UI
- Profile capture and portfolio context screens
- Guided financial tools (FIRE, Health Score, Tax, Life Events, Couple Planner, MF X-Ray)
- Conversational AI assistant with streaming responses
- Voice input/output flows for hands-free interaction
- Result visualization, summaries, and decision-friendly cards

## Product Experience Goals

- Fast, low-friction data entry for users who are not finance experts
- Clear separation of "portfolio" vs "what-if scenario" runs
- Transparent, explainable outputs instead of black-box recommendations
- Responsive UI that works smoothly on desktop and mobile
- Consistent design language across all tools

## UI Architecture

The UI is organized by feature modules and shared building blocks:

- App-level routing and page composition under `src/app`
- Reusable feature components under `src/components`
- Data-access clients and domain typing under `src/lib`
- Shared theming and global styles for a consistent visual system

## Design System and Interaction Style

- Utility-first styling with a consistent token-based theme
- Motion and transition patterns for progressive disclosure
- Card-first layouts for financial summaries and recommendations
- Accessible form controls and feedback states for long workflows

## AI Chat Experience

The chat interface is built for financial conversations, not generic chat.
It includes:

- Suggested prompt chips
- Streamed AI responses
- Voice recording support
- Speech playback support
- Message formatting optimized for financial explanations

## UI Screenshots

### Landing Page

![Landing Page](./public/screenshots/landing.png)

### Dashboard

![Dashboard](./public/screenshots/dashboard.png)

## Notes

This README is intentionally frontend-description only.
The full setup, installation, and run guide is maintained in the root project README.
