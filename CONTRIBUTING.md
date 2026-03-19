# Contributing / Контрибьютинг

## English

### Goals

Contributions should keep this repository:

- portable across machines
- safe for public GitHub publication
- practical for Codex and other AI-agent workflows
- easy to install and verify

### Good Contribution Types

- improving installer reliability
- improving Stitch workflow ergonomics
- fixing portability bugs
- improving docs for humans and AI agents
- adding validation or smoke-test coverage
- improving prompt guidance without bloating the skill

### Before You Start

Make sure you understand the separation of responsibilities:

- `skills/stitch-design-local/` contains the Codex skill definition and agent guidance
- `stitch-starter/` contains the executable local toolkit
- `install.sh` is the supported installation path

Do not introduce machine-specific assumptions such as:

- hardcoded home directories
- checked-in secrets
- checked-in generated runs
- instructions that require manual hidden steps without documenting them

### Local Setup For Development

```bash
git clone https://github.com/yshishenya/stitchflow.git
cd stitchflow
bash install.sh
```

If you are iterating on reinstalls:

```bash
bash install.sh --force
```

### Branching

Use a focused branch per change:

```bash
git checkout -b feat/improve-installer
git checkout -b fix/portable-path-resolution
git checkout -b docs/bilingual-readme
```

### Coding Guidelines

- keep shell scripts POSIX-friendly where practical, but Bash is acceptable for the installer
- prefer portable path handling
- preserve existing `.env` behavior on reinstall
- avoid unnecessary abstractions
- keep the skill concise; move detailed explanation into repo docs, not into the skill unless the agent needs it at runtime
- do not expose secrets in examples

### Documentation Guidelines

When editing docs:

- keep English and Russian sections aligned
- prefer concrete commands over vague prose
- document expected paths explicitly
- explain what is automatic and what the user must do manually
- keep AI-agent guidance operational, not marketing-heavy

### Testing Checklist

Before opening a pull request, run the relevant checks.

Minimum checklist:

```bash
node -v
npm -v
cd stitch-starter && npm ci
```

Installer test in a temporary Codex home:

```bash
TEST_AGENTS_HOME=/tmp/stitchflow-test-agents
TEST_CODEX_HOME=/tmp/stitchflow-test-codex
TEST_CLAUDE_HOME=/tmp/stitchflow-test-claude
TEST_OPENCLAW_HOME=/tmp/stitchflow-test-openclaw
rm -rf "$TEST_AGENTS_HOME" "$TEST_CODEX_HOME" "$TEST_CLAUDE_HOME" "$TEST_OPENCLAW_HOME"
AGENT_SKILLS_HOME="$TEST_AGENTS_HOME" \
CODEX_HOME="$TEST_CODEX_HOME" \
CLAUDE_HOME="$TEST_CLAUDE_HOME" \
OPENCLAW_HOME="$TEST_OPENCLAW_HOME" \
bash install.sh --target all
```

If `STITCH_API_KEY` is configured, also run:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run list
```

If you changed toolkit behavior, test the affected commands:

- `npm run generate -- --prompt "..."`
- `npm run edit -- --prompt "..."`
- `npm run variants -- --prompt "..." --variant-count 3`

### Pull Request Expectations

A good PR should include:

- a clear summary of what changed
- why the change is needed
- any behavior changes for users or agents
- manual test notes
- screenshots or output examples only when they add real value

Prefer small, focused pull requests over broad rewrites.

### Commit Message Guidance

Examples:

```text
Add portable installer for Stitch toolkit
Preserve .env on forced reinstall
Rewrite README in English and Russian
Fix relative path handling in toolkit runtime
```

### Security

- never commit `.env`
- never commit API keys
- review generated files before publishing them
- treat logs and screenshots as potentially sensitive

### Questions

If a change affects the public installation flow, skill trigger behavior, or secrets handling, document it clearly in the PR.

## Русский

### Цели

Любой вклад должен сохранять репозиторий:

- переносимым между машинами
- безопасным для публичного GitHub
- практичным для Codex и других ИИ-агентов
- простым в установке и проверке

### Какие Изменения Подходят

- повышение надежности installer-а
- улучшение ergonomics Stitch-workflow
- исправление багов переносимости
- улучшение документации для людей и ИИ-агентов
- добавление проверок и smoke-тестов
- улучшение prompt guidance без раздувания skill-а

### Перед Началом

Важно понимать разделение ответственности:

- `skills/stitch-design-local/` содержит сам skill и правила для агента
- `stitch-starter/` содержит исполняемый локальный toolkit
- `install.sh` является поддерживаемым способом установки

Не добавляйте машинно-зависимые предположения, например:

- захардкоженные home-пути
- закоммиченные секреты
- закоммиченные generated runs
- инструкции с неописанными ручными шагами

### Локальная Настройка Для Разработки

```bash
git clone https://github.com/yshishenya/stitchflow.git
cd stitchflow
bash install.sh
```

Если вы много раз переустанавливаете setup:

```bash
bash install.sh --force
```

### Ветки

Делайте отдельную ветку под конкретное изменение:

```bash
git checkout -b feat/improve-installer
git checkout -b fix/portable-path-resolution
git checkout -b docs/bilingual-readme
```

### Правила Для Кода

- по возможности держите shell-скрипты переносимыми, но для installer-а Bash допустим
- предпочитайте portable path handling
- сохраняйте текущее поведение `.env` при переустановке
- избегайте ненужных абстракций
- skill должен оставаться компактным; подробные объяснения лучше держать в документации репозитория, а не внутри skill-а, если они не нужны агенту во время выполнения
- не светите секреты в примерах

### Правила Для Документации

При правках документации:

- держите русскую и английскую части синхронными
- предпочитайте конкретные команды расплывчатым описаниям
- явно документируйте ожидаемые пути
- разделяйте, что делается автоматически, а что пользователь должен сделать руками
- рекомендации для ИИ-агентов должны быть операционными, а не маркетинговыми

### Чеклист Проверки

Перед открытием pull request прогоните релевантные проверки.

Минимальный набор:

```bash
node -v
npm -v
cd stitch-starter && npm ci
```

Проверка installer-а во временный Codex home:

```bash
TEST_AGENTS_HOME=/tmp/stitchflow-test-agents
TEST_CODEX_HOME=/tmp/stitchflow-test-codex
TEST_CLAUDE_HOME=/tmp/stitchflow-test-claude
TEST_OPENCLAW_HOME=/tmp/stitchflow-test-openclaw
rm -rf "$TEST_AGENTS_HOME" "$TEST_CODEX_HOME" "$TEST_CLAUDE_HOME" "$TEST_OPENCLAW_HOME"
AGENT_SKILLS_HOME="$TEST_AGENTS_HOME" \
CODEX_HOME="$TEST_CODEX_HOME" \
CLAUDE_HOME="$TEST_CLAUDE_HOME" \
OPENCLAW_HOME="$TEST_OPENCLAW_HOME" \
bash install.sh --target all
```

Если `STITCH_API_KEY` уже настроен, дополнительно запустите:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run list
```

Если менялось поведение toolkit-а, протестируйте затронутые команды:

- `npm run generate -- --prompt "..."`
- `npm run edit -- --prompt "..."`
- `npm run variants -- --prompt "..." --variant-count 3`

### Что Ожидается От Pull Request

Хороший PR должен содержать:

- ясное описание изменений
- объяснение, зачем это нужно
- любые изменения поведения для пользователей или агентов
- заметки по ручному тестированию
- скриншоты или примеры вывода только если они реально помогают

Предпочтительны маленькие и сфокусированные pull request-ы, а не широкие переписывания.

### Коммиты

Примеры:

```text
Add portable installer for Stitch toolkit
Preserve .env on forced reinstall
Rewrite README in English and Russian
Fix relative path handling in toolkit runtime
```

### Безопасность

- никогда не коммитьте `.env`
- никогда не коммитьте API-ключи
- проверяйте generated files перед публикацией
- считайте логи и скриншоты потенциально чувствительными

### Вопросы

Если изменение затрагивает публичный installation flow, поведение trigger-а skill-а или работу с секретами, обязательно явно опишите это в PR.
