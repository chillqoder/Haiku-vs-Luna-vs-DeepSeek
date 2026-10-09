# Деревня на небесном острове

Интерактивная низкополигональная диорама средневековой деревни на плавучем острове.
Next.js 16 (App Router, TypeScript) и Three.js r186. Построена по спецификации `village.md` и схеме `schema.jpeg`.

## Быстрый старт

```bash
npm install
npm run dev              # http://localhost:3000
```

- Продакшн: `npm run build && npm start`
- Проверка типов: `npm run typecheck`
- Пересоздать модели персонажей: `npm run assets:characters`

Управление: тяните мышью (или пальцем), чтобы вращать камеру на 360°, колёсико — приближение.
Панорамирование отключено, угол камеры сверху ограничен диапазоном 15°–75°.

## Структура

```
config/simulation-manifest.json        манифест симуляции (читается API при каждом запросе)
scripts/build-characters.ts            генератор GLB-персонажей и клипов анимации
public/models/characters/*.glb         king.glb, guard.glb, villager.glb
public/draco/gltf/                     декодер Draco из three.js (для сжатых GLB)
src/app/
  page.tsx                             клиентская страница, сцена подгружается с ssr: false
  layout.tsx, globals.css              корневой layout, стили HUD и полноэкранного холста
  api/simulation-config/route.ts       GET /api/simulation-config
  icon.svg                             иконка вкладки
src/components/DioramaCanvas.tsx       'use client'-мост React ↔ движок
src/diorama/
  core/DioramaApp.ts                   фасад: рендерер, сцена, камера, цикл кадров, ресайз, dispose
  core/CameraController.ts             OrbitControls: target (0, 0, 0), polar 15–75°, без панорамирования
  core/Lighting.ts                     тёплое солнце с тенями и HemisphereLight
  world/Layout.ts                      координаты острова, пруда, построек, дорожек
  world/Materials.ts                   палитра (все материалы с flatShading)
  world/StaticBatch.ts                 батчинг статики: один меш на материал
  world/Island.ts                      рельеф, пруд, подбрюшье, скальные шпили и корни
  world/Buildings.ts                   терраса, крепость, коттеджи, колодец, костёр, пирс, лесоповал
  world/Nature.ts                      деревья, кусты, цветы, облака
  world/Environment.ts                 сборка мира: статика, дым, пламя, рябь, облака
  world/Smoke.ts, world/Ripples.ts     дым (InstancedMesh) и кольца ряби на воде
  simulation/manifest.ts               типы и валидация манифеста (без three.js, общий для сервера и клиента)
  simulation/CharacterManager.ts       загрузка манифеста и GLB, создание контроллеров, update и dispose
  simulation/CharacterController.ts    базовый класс: AnimationMixer и кроссфейд клипов
  simulation/KingController.ts         король: зацикленный клип 8 с
  simulation/GuardController.ts        патруль: 12 с ходьбы, 2 с стойки с поворотом на 180° (slerp), обратно
  simulation/VillagerController.ts     житель: stationary, roam или orbit, события ряби
  utils/AssetLoader.ts                 кэш GLTFLoader и DRACOLoader
  utils/Time.ts                        обёртка над THREE.Timer
  utils/Random.ts, utils/dispose.ts    детерминированный генератор и освобождение ресурсов
```

## API: `GET /api/simulation-config`

Возвращает манифест в JSON с заголовком `Cache-Control: no-store`. Файл читается с диска при каждом запросе,
поэтому правка `config/simulation-manifest.json` применяется после перезагрузки страницы, без пересборки клиента.

Если манифест невалиден, ответ — HTTP 500:

```json
{ "error": "Некорректный манифест симуляции", "detail": "characters[3].patrol: неизвестный патруль \"x\"" }
```

Верхний уровень:

| Поле | Описание |
|---|---|
| `version` | `1`, версия формата |
| `assets.characters` | ключ модели → путь к GLB, например `"guard": "/models/characters/guard.glb"` |
| `areas` | именованные зоны блуждания: списки точек `[x, y, z]` (минимум две) |
| `patrols` | патрульные коридоры: ровно две точки `waypoints`, `walkSeconds`, `pauseSeconds` |
| `characters` | список персонажей, уникальные `id` |

Общие поля персонажа: `id`, `kind`, `role`, `model`, `scale` (по умолчанию 1), `tint` (имя материала в GLB → `#rrggbb`), `clips` (логическое имя состояния → имя клипа в GLB).

Виды персонажей (`kind`):

- `king`: `position`, `yawDeg`, клип `loop`.
- `guard`: `patrol` (имя патруля), `startSeconds` (сдвиг по фазе цикла), клипы `walk` и `inspect`.
- `villager`: `position`, `yawDeg`, `tools` (какие инструменты показать), `behavior`, `ripples` (необязательно), `clips`.
  - `behavior.type = "stationary"`: клип `loop`.
  - `behavior.type = "roam"`: `area`, `speed`, `idleSeconds: [min, max]`, клипы `idle` и `walk`.
  - `behavior.type = "orbit"`: `center`, `radius`, `lapSeconds`, клип `loop`.
  - `ripples`: `{ "anchor": "Bobber", "atSeconds": [4.88, 5.63] }`. Моменты указываются внутри клипа, в них на воде появляется рябь.

## Персонажи и клипы

| Модель | Клипы (длительность) | Персонажи |
|---|---|---|
| `king.glb` | `king_observe` (8 с) | король на балконе |
| `guard.glb` | `guard_walk` (0.9 с), `guard_inspect` (2 с) | 3 стражника |
| `villager.glb` | `villager_idle` (3 с), `villager_walk` (0.9 с), `villager_run` (0.45 с), `lumberjack_chop` (4 с), `cook_stir` (5 с), `fisherman_cast` (8 с) | лесоруб, повар, рыбак, 2 ребёнка, 3 блуждающих жителя |

Всего 12 персонажей, это меньше 15. GLB генерирует `scripts/build-characters.ts`: иерархии узлов и AnimationClip'ы
экспортируются через GLTFExporter. Сгенерированные файлы лежат в репозитории, поэтому запускать генератор нужно только при изменении моделей.

## Решения и расхождения со спецификацией

Спецификация (`village.md`) и схема (`schema.jpeg`) расходятся в нескольких местах. Принятые решения:

- **Жители.** В тексте 7–9, на схеме подписано «PEASANT (x10)». Взято 8 жителей: лесоруб, повар, рыбак, 2 ребёнка и 3 блуждающих. Это диапазон из текста. Добавить жителей можно записью в манифесте.
- **Коттеджи.** В тексте 3–4, на схеме 5 домов в двух кластерах. Взято 4 дома: два кластера по два дома.
- **Длительность действий.** Подписи «Per Character, 1–3 sec» на схеме прочитаны как длительности отдельных фаз. Длительности циклов взяты из текста: король 8 с, лесоруб 4 с, повар 5 с, рыбак 8 с.
- **Тени.** В текущей версии three.js `PCFSoftShadowMap` удалён. Используется `PCFShadowMap`, мягкость задаётся через `shadow.radius`.
- **Таймер.** `THREE.Clock` устарел (с r183), используется `THREE.Timer`.
- **Модели персонажей.** Внешних ассетов не было, поэтому модели сгенерированы кодом. Конвейер при этом настоящий: GLTFLoader, DRACOLoader, AnimationMixer. Сгенерированные GLB не сжаты Draco, декодер подключён для будущих сжатых моделей.
- **Окружение.** Остров, здания и растительность строятся кодом в `src/diorama/world/`, как описано в спецификации. Это не загружаемые файлы.
- **Страница — клиентский компонент.** В App Router опция `ssr: false` у `next/dynamic` допустима только в клиентском компоненте, поэтому `page.tsx` помечен `'use client'`.
- **flatShading.** Все материалы сцены и моделей используют `flatShading: true`. Исключение — кольца ряби: это `MeshBasicMaterial` без освещения, затенения у него нет.

## Ограничения

- Персонажи не обходят друг друга. Блуждающие жители могут пересечь круг, по которому бегают дети.
- Патрульный коридор — прямой отрезок из двух точек, так требует спецификация. Валидатор этого требует.
- Производительность на мобильных устройствах не профилировалась.
