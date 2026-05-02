# Contributing to SignalForge

Thank you for your interest in contributing!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/signalforge.git`
3. Install dependencies: `npm install`
4. Copy env template: `cp .env.example .env`
5. Edit `.env` with your API keys
6. Run tests: `npm test`

## TDD Workflow (Strict)

SignalForge follows a strict TDD workflow:

```
Phase1: Baseline     → Write failing test
Phase2: Test Gen     → Generate tests for feature
Phase3: Implementation → Write code to pass tests
Phase4: Regression   → Verify no regressions
```

**Zero-regression principle**: Every bug gets a test, every feature gets coverage.

## Running Tests

```bash
npm test  # Runs all 27 tests
```

### Test Structure

| Module | File | Tests |
|--------|------|-------|
| Queue | `tests/queue.test.js` | 10 |
| API | `tests/api.test.js` | 7 |
| Telegram | `tests/telegram.test.js` | 4 |
| KeeperHub | `tests/keeperhub.test.js` | 6 |

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m 'Add your feature'`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## Code Style

- Explain every line of code (as comments)
- Use camelCase for variables
- Use PascalCase for classes
- Add JSDoc comments for functions

## Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Include tests for new features
- Update documentation if needed
- Ensure all tests pass

## Skills Execution Order

When working on this project, skills should be run in this order:
1. `/plan-ceo-review`
2. `/plan-design-review`
3. `/plan-eng-review`
4. `/cso`
5. `/scrape` (in other terminal)
6. `/pair-agent` (in other terminal)
7. `/qa`
8. `/ship`
9. `/setup-deploy`
10. `/supabase` (in other terminal)

## Questions?

Open an issue on GitHub or reach out to @vim719.
