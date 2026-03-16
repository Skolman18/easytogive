# EasyToGive — Claude Code Rules

## Core principles
- Read the entire relevant codebase before making any changes
- Make the minimum changes necessary to accomplish the task
- Never change files unrelated to the current task
- Always preserve existing functionality — never break what works

## Code quality
- Zero TypeScript errors before finishing any task
- Zero console errors before finishing any task
- Run the build and confirm it passes before reporting done
- Use existing patterns — do not invent new ones

## Stack
- Framework: Next.js 16 App Router
- Styling: Tailwind CSS — use existing design tokens
- Database: Supabase — use existing client patterns
- Payments: Stripe Connect — never change payment routing logic
- Email: Resend — send from receipts@easytogive.online
- Fonts: DM Serif Display (headings), DM Sans (body), DM Mono (code)

## Design system
- Background: #faf9f6
- Primary green: #1a7a4a
- Light green: #e8f5ee
- Border: #e5e1d8
- Text primary: #1a1a18
- Text secondary: #5c5b56
- No emojis in UI
- Minimum touch target: 44px height on all interactive elements

## Security
- Never expose API keys in client-side code
- Always use environment variables
- Rate limit all API endpoints
- Validate all user inputs server-side

## Git
- Commit after every completed task with a clear message
- Push to staging branch — never directly to main
- Main branch is production only
