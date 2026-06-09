# RepoLens — Frontend Skeleton

Цель: собрать рабочий фронтенд-скелет приложения для анализа GitHub-репозиториев. Без бэкенда и без AI — вся логика на клиенте, данные моковые (или прямой fetch к публичному GitHub API из браузера, без секретов).

## Что войдёт в MVP скелета

1. **Главный экран** с инпутом для GitHub URL и кнопкой "Analyze".
2. **Парсинг URL** на клиенте (`owner/repo`) с валидацией.
3. **Загрузка дерева репозитория** напрямую из публичного GitHub API (`/repos/:owner/:repo` + `/git/trees/:branch?recursive=1`) — без ключей, работает для public repos.
4. **Фильтрация мусора** (`node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, lock-файлы, `*.min.js`).
5. **File importance scoring** по пути (без чтения контента — на этом этапе достаточно path-based).
6. **3-колоночный layout**:
   - Левая: File Tree (вложенная, сворачиваемая).
   - Центр: плейсхолдер "AI Overview" (заглушка с пустым состоянием — будет позже).
   - Правая: "Start Here" — топ-10 файлов по score.
7. **Состояния**: idle / loading / error / loaded (с тостами через существующий sonner).

## Структура файлов

```text
src/
├─ routes/
│  ├─ __root.tsx                (без изменений)
│  └─ index.tsx                 (главный экран; заменяет placeholder)
├─ components/
│  ├─ repo-input.tsx            (URL input + submit)
│  ├─ file-tree.tsx             (рекурсивное дерево)
│  ├─ important-files.tsx       (Start Here список)
│  ├─ ai-overview-placeholder.tsx
│  └─ repo-header.tsx           (имя репо, звёзды, описание)
├─ lib/
│  ├─ github.ts                 (parseGitHubUrl, fetchRepoTree — browser fetch)
│  ├─ filters.ts                (shouldIgnoreFile)
│  ├─ scoring.ts                (scoreFile by path)
│  └─ tree.ts                   (flat list → nested tree)
└─ types/
   └─ repo.ts                   (RepoMeta, RepoFile, TreeNode)
```

## Технические детали

- **State**: локальный `useState` в `routes/index.tsx`; данные репо хранятся в памяти. Никаких роутов вида `/:owner/:repo` на этом этапе.
- **Fetch**: прямой `fetch("https://api.github.com/...")` из браузера. Без токена — лимит 60 req/h, для скелета достаточно. Ошибки 403/404 показываем через toast.
- **Дерево**: GitHub отдаёт плоский список путей — конвертируем в nested структуру в `lib/tree.ts`.
- **Scoring**: только по path (контент не качаем — это N запросов, делаем позже). Сортировка убывающая, top-10.
- **UI**: shadcn компоненты (`Input`, `Button`, `Card`, `ScrollArea`, `Badge`, `Skeleton`). Иконки из `lucide-react` (Folder, File, Star, GitBranch).
- **SEO**: `head()` в `index.tsx` с title "RepoLens — Understand any GitHub repo".

## Что НЕ делаем сейчас

- Бэкенд / server functions / Lovable Cloud.
- Чтение контента файлов и content-based scoring.
- AI summary, RAG, чат, embeddings.
- React Flow / графы.
- Авторизация GitHub, приватные репо.
- Роутинг по `owner/repo`, история, сохранение.

## Definition of done

Пользователь вставляет `https://github.com/facebook/react`, жмёт Analyze, через 1–2 сек видит: шапку репо, дерево файлов слева, заглушку AI по центру, топ-10 важных файлов справа.
