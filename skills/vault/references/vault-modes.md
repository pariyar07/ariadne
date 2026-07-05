# Vault Modes

Use this reference to adapt the agentic vault structure to different domains.

The default folders are a starting point, not a constraint. Add mode-specific folders only when they improve retrieval, processing, or repeated use.

## Universal Core

Most durable vaults benefit from:

- `00 Index.md`
- `AGENTS.md`
- `CLAUDE.md` when Claude Code is used
- `Agent/`
- `Raw/`
- `Raw/Sources/`
- `Inbox/`
- `Processing Queue/`
- `Notes/`
- `Research/`
- `Concepts/`
- `Entities/`
- `Relationships/`
- `Questions/`
- `Decisions/`
- `Outputs/`
- `Templates/`
- `Bases/`
- `Archive/`

## Project / Startup Mode

Use for startups, products, software projects, agencies, or operating companies.

Common folders:

- `Product/`
- `Architecture/`
- `Customers/`
- `Market/`
- `GTM/`
- `Sales/`
- `Fundraising/`
- `Roadmap/`
- `Experiments/`

Common flow:

```text
Source / Customer Input -> Insight -> Product/Market/Architecture Note -> Decision -> Roadmap
```

## Research Mode

Use for studying a field, thesis, technology, literature, or market.

Common folders:

- `Research/`
- `Literature/`
- `Papers/`
- `Claims/`
- `People/`
- `Datasets/`
- `Bibliography/`
- `Search/` for saved search strategies, query notes, and reviewed result sets

Common flow:

```text
Source -> Claim -> Research Note -> Concept -> Synthesis -> Question/Decision
```

## Sales Mode

Use for pipeline, account research, founder-led sales, consulting, or customer development.

Common folders:

- `Sales/`
- `Accounts/`
- `Contacts/`
- `Opportunities/`
- `Calls/`
- `Objections/`
- `Follow Ups/`
- `Playbooks/`

Common flow:

```text
Lead -> Account -> Contact -> Pain -> Opportunity -> Objection -> Follow-up -> Decision
```

## Engineering Mode

Use for software systems, infrastructure, incidents, runbooks, technical decisions, and implementation memory.

Common folders:

- `Engineering/`
- `Architecture/`
- `Components/`
- `Incidents/`
- `Runbooks/`
- `Risks/`
- `Experiments/`
- `Releases/`

Common flow:

```text
System -> Component -> Change -> Incident/Risk -> Runbook -> Decision
```

## Learning Mode

Use for learning a discipline or skill.

Common folders:

- `Lessons/`
- `Exercises/`
- `Examples/`
- `Practice/`
- `Glossary/`
- `Resources/`
- `Projects/`

Common flow:

```text
Source -> Lesson -> Concept -> Practice -> Mistake -> Review -> Next Exercise
```

## Life Mode

Use for personal operating systems.

Common folders:

- `Areas/`
- `Goals/`
- `Habits/`
- `Journal/`
- `Health/`
- `Finance/`
- `Relationships/`
- `Admin/`
- `Reviews/`

Common flow:

```text
Area -> Goal -> Habit/System -> Log -> Review -> Decision
```

## Fitness / Gym Mode

Use for training, health experiments, body metrics, and program design.

Common folders:

- `Training/`
- `Programs/`
- `Exercises/`
- `Workouts/`
- `Nutrition/`
- `Metrics/`
- `Injuries/`
- `Reviews/`

Common flow:

```text
Goal -> Program -> Workout -> Exercise -> Set/Metric -> Review -> Adjustment
```

## Cooking Mode

Use for recipes, meal planning, nutrition, or culinary research.

Common folders:

- `Recipes/`
- `Ingredients/`
- `Techniques/`
- `Meal Plans/`
- `Equipment/`
- `Nutrition/`
- `Sources/`
- `Reviews/`

Common flow:

```text
Recipe -> Ingredient -> Technique -> Meal Plan -> Feedback -> Revision
```

## System / Operations Mode

Use for workflows, automations, runbooks, or infrastructure.

Common folders:

- `Runbooks/`
- `SOPs/`
- `Automation/`
- `Tools/`
- `Logs/`
- `Checklists/`
- `Incidents/`

Common flow:

```text
Event -> Log -> Diagnosis -> Runbook -> Decision -> Update
```

## Mode Rule

Do not add every possible folder upfront.

Start with the universal core and add a mode folder when:

- a recurring workflow needs a home
- a folder hub would improve traversal
- a Base can inspect useful metadata
- future agents need a stable route

Agents should call out bloat when a mode folder grows without a hub, when a hub becomes too long to scan, or when repeated work lacks a task-routing row.

Create a local folder `AGENTS.md` when a mode needs specialized rules that global vault instructions cannot cover well. Examples include `Sales/AGENTS.md`, `Engineering/AGENTS.md`, `Research/AGENTS.md`, or `Customers/AGENTS.md`.
